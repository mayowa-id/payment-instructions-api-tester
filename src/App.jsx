import React, { useState } from 'react';
import { Play, Check, X, AlertCircle, Clock } from 'lucide-react';

const API_URL = 'https://payment-instructions-api.vercel.app/payment-instructions';

const testCases = [
  // ... keep all your test cases exactly as they are
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
  expectedCode: 'AP00',  
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
  expectedCode: 'SY03',  
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
    if (result.status === 'running') return <Clock className="icon blue spin" />;
    if (result.status === 'error') return <AlertCircle className="icon orange" />;
    return result.passed ? 
      <Check className="icon green" /> : 
      <X className="icon red" />;
  };

  const completedTests = Object.values(results).filter(r => r.status === 'complete').length;
  const passedTests = Object.values(results).filter(r => r.status === 'complete' && r.passed).length;

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <div className="main-card">
          <div className="header">
            <h1>Payment Instructions API</h1>
            <p>Comprehensive Test Suite</p>
            
            {completedTests > 0 && (
              <div className="stats-container">
                <div className="stat-item">
                  <div className="stat-dot green"></div>
                  <span>{passedTests} passed</span>
                </div>
                <div className="stat-item">
                  <div className="stat-dot red"></div>
                  <span>{completedTests - passedTests} failed</span>
                </div>
                <div className="stat-item">
                  <div className="stat-dot gray"></div>
                  <span>{testCases.length - completedTests} pending</span>
                </div>
              </div>
            )}
          </div>

          <div className="content">
            <div className="button-group">
              <button
                onClick={runAllTests}
                disabled={running}
                className="btn btn-primary"
              >
                <Play className="icon" />
                Run All Tests
              </button>
              <button
                onClick={clearResults}
                disabled={running}
                className="btn btn-secondary"
              >
                Clear Results
              </button>
            </div>

            <div className="section">
              <h2 className="section-header">
                <div className="section-indicator green"></div>
                Valid Test Cases
              </h2>
              <div className="test-grid">
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

            <div className="section">
              <h2 className="section-header">
                <div className="section-indicator red"></div>
                Invalid Test Cases
              </h2>
              <div className="test-grid">
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
  );
}

function TestCard({ test, result, onRun, disabled, getStatusIcon }) {
  const [expanded, setExpanded] = useState(false);
  React.useEffect(() => {
    if (result && result.status === 'complete') {
      setExpanded(true);
    }
  }, [result]);

  return (
    <div className="test-card">
      <div className="test-card-main">
        <div className="test-card-content">
          <div className="test-number">{test.id}</div>
          <div className="test-info">
            <h3 className="test-name">{test.name}</h3>
            <p className="test-expected">
              Expect {test.expectedStatus} · {test.expectedCode}
            </p>
          </div>
          <div className="test-actions">
            {result && getStatusIcon(result)}
            <button
              onClick={onRun}
              disabled={disabled}
              className="btn-run"
            >
              Run
            </button>
            {result && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-details"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {expanded && result && (
        <div className="test-details">
          <div className="details-content">
            <div className="details-grid">
              <div>
                <span className="detail-label">Status Code:</span>
                <span className={`detail-value ${result.statusCode === test.expectedStatus ? 'green' : 'red'}`}>
                  {result.statusCode}
                </span>
              </div>
              <div>
                <span className="detail-label">Response Code:</span>
                <span className={`detail-value ${result.response?.status_code === test.expectedCode ? 'green' : 'red'}`}>
                  {result.response?.status_code || 'N/A'}
                </span>
              </div>
            </div>
            <div className="response-container">
              <span className="response-label">Response:</span>
              <pre className="response-pre">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}