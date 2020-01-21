#include <iostream>
#include <bitset>
#include <vector>
#include <string>
#include <locale.h>

#include <iomanip>
#include <io.h>
#include <fcntl.h>

#include <Windows.h>
#include <shlwapi.h>
#pragma comment(lib, "Shlwapi.lib")
#pragma comment(lib, "winmm.lib")


using namespace std;


void PrintError(const std::wstring& wstr)
{
	WCHAR errorBuffer[256];
	FormatMessageW(FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, NULL, GetLastError(), MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), errorBuffer, (sizeof(errorBuffer) / sizeof(wchar_t)), NULL);
	wcout << "Ошибка при вызове " << wstr << ", сообщение ошибки (" << GetLastError() << "): " << errorBuffer << endl;
}

DWORD gcd(DWORD a, DWORD b)
{
	if (b == 0) return a;
	return gcd(b, a % b);
}



HANDLE apcwrite, apcread;
std::vector<LPOVERLAPPED> readOverlapped;
std::vector<LPVOID> readBuffer;
DWORD writeBufferSize, operationCount;
int asyncdone;

void WINAPI LpwriteCompletionRoutine(DWORD dwErrorCode, DWORD dwNumberOfBytesTransfered, LPOVERLAPPED lpOverlapped);

void WINAPI LpreadCompletionRoutine(DWORD dwErrorCode, DWORD dwNumberOfBytesTransfered, LPOVERLAPPED lpOverlapped)
{
	unsigned int oi = ((lpOverlapped->Offset) / writeBufferSize) % operationCount;

	if (dwErrorCode != ERROR_HANDLE_EOF)
	{
		LPOVERLAPPED ov = new OVERLAPPED();
		ov->Offset = lpOverlapped->Offset;
		ov->OffsetHigh = lpOverlapped->OffsetHigh;
		if (!WriteFileEx(apcwrite, readBuffer[oi], writeBufferSize, ov, LpwriteCompletionRoutine)) {
			PrintError(L"WriteFileEx()"); asyncdone = operationCount; CancelIo(apcread); CancelIo(apcwrite);
		}
	}
	else ++asyncdone;
}

void WINAPI LpwriteCompletionRoutine(DWORD dwErrorCode, DWORD dwNumberOfBytesTransfered, LPOVERLAPPED lpOverlapped)
{
	unsigned int oi = ((lpOverlapped->Offset) / writeBufferSize) % operationCount;
	delete readOverlapped[oi];

	readOverlapped[oi] = new OVERLAPPED();

	LARGE_INTEGER offset; offset.QuadPart = lpOverlapped->Offset + (lpOverlapped->OffsetHigh << 32) + writeBufferSize * operationCount;
	readOverlapped[oi]->Offset = offset.LowPart;
	readOverlapped[oi]->OffsetHigh = offset.HighPart;
	if (!ReadFileEx(apcread, readBuffer[oi], writeBufferSize, readOverlapped[oi], LpreadCompletionRoutine)) {
		PrintError(L"ReadFileEx()"); asyncdone = operationCount; CancelIo(apcread); CancelIo(apcwrite);
	}

	delete lpOverlapped;
}



int main()
{
	setlocale(0, "RUS");

	UINT uintResult;

	WCHAR logicalDrivesBuffer[512];
	WCHAR volumeNameBuffer[MAX_PATH + 1];
	DWORD volumeSerialNumber;
	DWORD maximumComponentLength;
	DWORD fileSystemFlags;
	WCHAR fileSystemNameBuffer[MAX_PATH + 1];

	DWORD lpSectorsPerCluster;
	DWORD lpBytesPerSector;
	DWORD lpNumberOfFreeClusters;
	DWORD lpTotalNumberOfClusters;


	WCHAR currentDirectory[MAX_PATH + 1];
	DWORD directoryLength = GetCurrentDirectoryW(MAX_PATH, currentDirectory), variableDirLength = directoryLength;


	HANDLE file;
	DWORD fileAttributes;
	BY_HANDLE_FILE_INFORMATION fileInformation;
	SYSTEMTIME time;


	DWORD readBufferSize, sectorsPerCluster1, sectorsPerCluster2;

	DWORD timeBegin, timeEnd;
	LARGE_INTEGER readFilePointer, writeFilePointer, zeroFilePointer;
	zeroFilePointer.QuadPart = 0;

	apcread = apcwrite = INVALID_HANDLE_VALUE;

	string s;
	cout << "read: ";
	cin >> s;

					
	apcread = CreateFile(s.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, FILE_FLAG_NO_BUFFERING | FILE_FLAG_OVERLAPPED, nullptr);
	if (apcread == INVALID_HANDLE_VALUE) {
		cout << "Invalid read file" << endl;
		return -1;
	}
	readBufferSize = 512; //sectorsPerCluster1 = 0;

	string sNew;
	cout << "write: ";
	cin >> sNew;
	apcwrite = CreateFile(sNew.c_str(), GENERIC_WRITE, NULL, NULL, CREATE_ALWAYS, FILE_FLAG_NO_BUFFERING | FILE_FLAG_OVERLAPPED, NULL);
	if (apcwrite == INVALID_HANDLE_VALUE) {
		cout << "Invalid write file" << endl;
		return -1;
	}
	writeBufferSize = 512; //sectorsPerCluster2 = 0;



	cout << "Введите множитель размера сектора для копирования информации блоками: ";
		cin >> uintResult;

	writeBufferSize = uintResult * readBufferSize;
	cout << "Размер копируемой информации за одну операцию: " << writeBufferSize << L" байт." << endl << endl;

	cout << "Введите количество неперекрывающихся операций ввода/вывода: ";
	cin >> operationCount;

	if (readOverlapped.size()) { for (auto o : readOverlapped) if (o) delete o; readOverlapped.clear(); }
	if (readBuffer.size()) { for (auto o : readBuffer) if (o) delete o; readBuffer.clear(); }
	for (int i = 0; i < operationCount; ++i) readOverlapped.push_back(new OVERLAPPED());
	for (int i = 0; i < operationCount; ++i) readBuffer.push_back(new CHAR[writeBufferSize]);

							asyncdone = 0;
							SetFilePointerEx(apcread, zeroFilePointer, &readFilePointer, FILE_END);
							wcout << "Выполняется копирование..." << endl;
							timeBegin = timeGetTime();

							for (int i = 0; i < operationCount; ++i)
							{
								readOverlapped[i]->Offset = i * readBufferSize;
								if (!ReadFileEx(apcread, readBuffer[i], writeBufferSize, readOverlapped[i], LpreadCompletionRoutine))
								{
									PrintError(L"ReadFileEx()"); asyncdone = operationCount;
									CancelIo(apcread); CancelIo(apcwrite); break;
								}
							}

							do SleepEx(INFINITY, true);
							while (asyncdone < operationCount);

							SetFilePointerEx(apcwrite, readFilePointer, NULL, FILE_BEGIN);
							SetEndOfFile(apcwrite);

							timeEnd = timeGetTime();
							cout << "Операция завершена за: " << timeEnd - timeBegin << "ms." << endl;


CloseHandle(apcread);
CloseHandle(apcwrite); 
							if (readOverlapped.size()) { for (auto o : readOverlapped) if (o) delete o; readOverlapped.clear(); }
							if (readBuffer.size()) { for (auto o : readBuffer) if (o) delete[] o; readBuffer.clear(); }

					system("pause");



	return 0;
}