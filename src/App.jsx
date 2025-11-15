import React, { useState } from 'react';
import { Play, Check, X, AlertCircle, Clock } from 'lucide-react';

const API_URL = 'https://payment-instructions-api.vercel.app/payment-instructions';

const testCases = [
  {
    id: 1,
    name: 'Valid DEBIT Transaction',
    category: 'valid',
    expectedStatus: 200,
    expectedCode: 'AP00',
    payload: {
      accounts: [
        { id: 'N90394', balance: 1000, currency: 'USD' },
        { id: 'N9122', balance: 500, currency: 'USD' }
      ],
      instruction: 'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122'
    }
  },
  {
    id: 2,
    name: 'Future Date Transaction',
    category: 'valid',
    expectedStatus: 200,
    expectedCode: 'AP02',
    payload: {
      accounts: [
        { id: 'acc-001', balance: 1000, currency: 'NGN' },
        { id: 'acc-002', balance: 500, currency: 'NGN' }
      ],
      instruction: 'CREDIT 300 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001 ON 2026-12-31'
    }
  },
  {
    id: 3,
    name: 'Case Insensitive Parsing',
    category: 'valid',
    expectedStatus: 200,
    expectedCode: 'AP00',
    payload: {
      accounts: [
        { id: 'a', balance: 500, currency: 'GBP' },
        { id: 'b', balance: 200, currency: 'GBP' }
      ],
      instruction: 'debit 100 gbp from account a for credit to account b'
    }
  },
  {
    id: 4,
    name: 'Past Date (Immediate Execution)',
    category: 'valid',
    expectedStatus: 200,
    expectedCode: 'AP00',
    payload: {
      accounts: [
        { id: 'x', balance: 500, currency: 'NGN' },
        { id: 'y', balance: 200, currency: 'NGN' }
      ],
      instruction: 'DEBIT 100 NGN FROM ACCOUNT x FOR CREDIT TO ACCOUNT y ON 2024-01-15'
    }
  },
  {
    id: 5,
    name: 'Currency Mismatch',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'CU01',
    payload: {
      accounts: [
        { id: 'a', balance: 100, currency: 'USD' },
        { id: 'b', balance: 500, currency: 'GBP' }
      ],
      instruction: 'DEBIT 50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b'
    }
  },
  {
    id: 6,
    name: 'Insufficient Funds',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'AC01',
    payload: {
      accounts: [
        { id: 'a', balance: 100, currency: 'USD' },
        { id: 'b', balance: 500, currency: 'USD' }
      ],
      instruction: 'DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b'
    }
  },
  {
    id: 7,
    name: 'Unsupported Currency',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'CU02',
    payload: {
      accounts: [
        { id: 'a', balance: 100, currency: 'EUR' },
        { id: 'b', balance: 500, currency: 'EUR' }
      ],
      instruction: 'DEBIT 50 EUR FROM ACCOUNT a FOR CREDIT TO ACCOUNT b'
    }
  },
  {
    id: 8,
    name: 'Same Account Transfer',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'AC02',
    payload: {
      accounts: [{ id: 'a', balance: 500, currency: 'USD' }],
      instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT a'
    }
  },
  {
    id: 9,
    name: 'Negative Amount',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'AM01',
    payload: {
      accounts: [
        { id: 'a', balance: 500, currency: 'USD' },
        { id: 'b', balance: 200, currency: 'USD' }
      ],
      instruction: 'DEBIT -100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b'
    }
  },
  {
    id: 10,
    name: 'Account Not Found',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'AC03',
    payload: {
      accounts: [{ id: 'a', balance: 500, currency: 'USD' }],
      instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT xyz'
    }
  },
  {
    id: 11,
    name: 'Decimal Amount',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'AM01',
    payload: {
      accounts: [
        { id: 'a', balance: 500, currency: 'USD' },
        { id: 'b', balance: 200, currency: 'USD' }
      ],
      instruction: 'DEBIT 100.50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b'
    }
  },
  {
    id: 12,
    name: 'Malformed Instruction',
    category: 'invalid',
    expectedStatus: 400,
    expectedCode: 'SY01',
    payload: {
      accounts: [
        { id: 'a', balance: 500, currency: 'USD' },
        { id: 'b', balance: 200, currency: 'USD' }
      ],
      instruction: 'SEND 100 USD TO ACCOUNT b'
    }
  }
];

export default function PaymentAPITester() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [activeTest, setActiveTest] = useState(null);

  const runTest = async (testCase) => {
    setActiveTest(testCase.id);
    setResults(prev => ({
      ...prev,
      [testCase.id]: { status: 'running' }
    }));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });

      const data = await response.json();
      const passed = response.status === testCase.expectedStatus && 
                     data.status_code === testCase.expectedCode;

      setResults(prev => ({
        ...prev,
        [testCase.id]: {
          status: 'complete',
          passed,
          response: data,
          statusCode: response.status
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testCase.id]: {
          status: 'error',
          passed: false,
          error: error.message
        }
      }));
    } finally {
      setActiveTest(null);
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    for (const testCase of testCases) {
      await runTest(testCase);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setRunning(false);
  };

  const clearResults = () => {
    setResults({});
  };

  const validTests = testCases.filter(t => t.category === 'valid');
  const invalidTests = testCases.filter(t => t.category === 'invalid');

  const getStatusIcon = (result) => {
    if (!result) return null;
    if (result.status === 'running') return <Clock className="w-4 h-4 animate-spin text-blue-500" />;
    if (result.status === 'error') return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return result.passed ? 
      <Check className="w-4 h-4 text-green-500" /> : 
      <X className="w-4 h-4 text-red-500" />;
  };

  const completedTests = Object.values(results).filter(r => r.status === 'complete').length;
  const passedTests = Object.values(results).filter(r => r.status === 'complete' && r.passed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Payment Instructions API</h1>
            <p className="text-slate-300">Comprehensive Test Suite</p>
            
            {completedTests > 0 && (
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>{passedTests} passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>{completedTests - passedTests} failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span>{testCases.length - completedTests} pending</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex gap-3 mb-8">
              <button
                onClick={runAllTests}
                disabled={running}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Play className="w-4 h-4" />
                Run All Tests
              </button>
              <button
                onClick={clearResults}
                disabled={running}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Clear Results
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-green-500 rounded"></div>
                  Valid Test Cases
                </h2>
                <div className="grid gap-3">
                  {validTests.map(test => (
                    <TestCard
                      key={test.id}
                      test={test}
                      result={results[test.id]}
                      onRun={() => runTest(test)}
                      disabled={running || activeTest === test.id}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-red-500 rounded"></div>
                  Invalid Test Cases
                </h2>
                <div className="grid gap-3">
                  {invalidTests.map(test => (
                    <TestCard
                      key={test.id}
                      test={test}
                      result={results[test.id]}
                      onRun={() => runTest(test)}
                      disabled={running || activeTest === test.id}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCard({ test, result, onRun, disabled, getStatusIcon }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-colors">
      <div className="p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            {test.id}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-800">{test.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Expect {test.expectedStatus} · {test.expectedCode}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {result && getStatusIcon(result)}
            <button
              onClick={onRun}
              disabled={disabled}
              className="px-4 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run
            </button>
            {result && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {expanded && result && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Status Code:</span>
                <span className={`ml-2 font-mono ${result.statusCode === test.expectedStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {result.statusCode}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Response Code:</span>
                <span className={`ml-2 font-mono ${result.response?.status_code === test.expectedCode ? 'text-green-600' : 'text-red-600'}`}>
                  {result.response?.status_code || 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-sm block mb-2">Response:</span>
              <pre className="bg-white border border-slate-200 rounded p-3 text-xs overflow-x-auto">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}