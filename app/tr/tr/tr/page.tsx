"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface Transaction {
  address: string;
  amount: string;
  txHash?: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

export default function TestPage() {
  const [inputText, setInputText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const parseTransactions = (text: string) => {
    const lines = text.split('\n');
    const transactions: Transaction[] = [];
    let currentTx: Partial<Transaction> = {};

    lines.forEach(line => {
      // 주소와 금액 파싱
      if (line.includes('address') && line.includes('amount')) {
        const match = line.match(/'address': '([^']+)', 'amount': '([^']+)'/);
        if (match) {
          currentTx = {
            address: match[1],
            amount: match[2]
          };
        }
      }
      
      // 트랜잭션 결과 파싱
      if (line.includes('"msg"') || line.includes('"error"')) {
        if (line.includes('"msg": "successfully')) {
          const hashMatch = line.match(/"txhash": "([^"]+)"/);
          if (hashMatch && currentTx.address && currentTx.amount) {
            transactions.push({
              address: currentTx.address,
              amount: currentTx.amount,
              txHash: hashMatch[1],
              status: 'success'
            });
          }
        } else if (line.includes('"error"')) {
          const errorMatch = line.match(/"error": "([^"]+)"/);
          const hashMatch = line.match(/"txhash": "([^"]+)"/);
          if (currentTx.address && currentTx.amount) {
            transactions.push({
              address: currentTx.address,
              amount: currentTx.amount,
              txHash: hashMatch ? hashMatch[1] : undefined,
              status: 'error',
              errorMessage: errorMatch ? errorMatch[1] : undefined
            });
          }
        }
        currentTx = {};
      }
    });

    setTransactions(transactions);
  };

  const downloadExcel = () => {
    if (transactions.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 엑셀 파일명 생성 (현재 날짜 포함)
    const date = new Date();
    const fileName = `트랜잭션_내역_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}.xlsx`;

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 데이터 포맷팅
    const excelData = transactions.map((tx, index) => ({
      '번호': index + 1,
      '주소': tx.address,
      '금액': tx.amount,
      '상태': tx.status === 'success' ? '성공' : '실패',
      '트랜잭션 해시': tx.txHash || '-',
      '에러 메시지': tx.errorMessage || '-'
    }));

    // 요약 데이터 추가
    const failedAmount = transactions
      .filter(tx => tx.status === 'error')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const summaryData = [
      { '구분': '총 트랜잭션', '값': transactions.length + '개' },
      { '구분': '성공 트랜잭션', '값': transactions.filter(tx => tx.status === 'success').length + '개' },
      { '구분': '실패 트랜잭션', '값': transactions.filter(tx => tx.status === 'error').length + '개' },
      { '구분': '실패 금액 합계', '값': failedAmount },
      { '구분': '총 금액', '값': transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) }
    ];

    // 데이터를 워크시트로 변환
    const ws = XLSX.utils.json_to_sheet(excelData);
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    
    // 열 너비 설정
    const colWidths = [
      { wch: 6 },  // 번호
      { wch: 45 }, // 주소
      { wch: 10 }, // 금액
      { wch: 8 },  // 상태
      { wch: 70 }, // 트랜잭션 해시
      { wch: 50 }  // 에러 메시지
    ];
    ws['!cols'] = colWidths;

    const summaryColWidths = [
      { wch: 15 }, // 구분
      { wch: 20 }  // 값
    ];
    summaryWs['!cols'] = summaryColWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, '트랜잭션 내역');
    XLSX.utils.book_append_sheet(wb, summaryWs, '요약');

    // 파일 다운로드
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <textarea
          className="w-full h-40 p-2 border rounded"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="트랜잭션 로그를 여기에 붙여넣으세요"
        />
        <div className="mt-2 flex gap-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => parseTransactions(inputText)}
          >
            분석하기
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={downloadExcel}
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">번호</th>
              <th className="px-4 py-2">주소</th>
              <th className="px-4 py-2">금액</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">트랜잭션 해시</th>
              <th className="px-4 py-2">에러 메시지</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border px-4 py-2 text-center">{index + 1}</td>
                <td className="border px-4 py-2 font-mono text-sm">{tx.address}</td>
                <td className="border px-4 py-2 text-right">{tx.amount}</td>
                <td className="border px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded ${
                    tx.status === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tx.status === 'success' ? '성공' : '실패'}
                  </span>
                </td>
                <td className="border px-4 py-2 font-mono text-sm">
                  {tx.txHash || '-'}
                </td>
                <td className="border px-4 py-2 font-mono text-sm">
                  {tx.errorMessage || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">요약</h3>
          <p>총 트랜잭션: {transactions.length}개</p>
          <p>성공: {transactions.filter(tx => tx.status === 'success').length}개</p>
          <p>실패: {transactions.filter(tx => tx.status === 'error').length}개</p>
          <p>총 금액: {transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">결과:</h2>
          <button
            onClick={downloadExcel}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            엑셀 다운로드
          </button>
        </div>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(transactions, null, 2)}
        </pre>
      </div>
    </div>
  );
}
