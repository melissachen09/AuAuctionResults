'use client';

import { useState, useEffect } from 'react';

export default function DashboardDebug() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);

  const addDebugInfo = (message: string, data?: any) => {
    setDebugInfo(prev => [...prev, { 
      timestamp: new Date().toISOString(), 
      message, 
      data: data ? JSON.stringify(data, null, 2) : null 
    }]);
  };

  useEffect(() => {
    const fetchData = async () => {
      addDebugInfo('Starting fetch...');
      
      try {
        const url = '/api/suburbs?limit=20';
        addDebugInfo('Fetching URL', url);
        
        const response = await fetch(url);
        addDebugInfo('Response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        addDebugInfo('Data parsed successfully', {
          dataLength: result.data?.length,
          total: result.pagination?.total
        });
        
        setData(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        addDebugInfo('Error occurred', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
        addDebugInfo('Fetch completed');
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Dashboard Debug</h1>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Loading State</h3>
          <p className={loading ? 'text-yellow-600' : 'text-green-600'}>
            {loading ? 'Loading...' : 'Complete'}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Error State</h3>
          <p className={error ? 'text-red-600' : 'text-green-600'}>
            {error || 'No errors'}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Data State</h3>
          <p className={data ? 'text-green-600' : 'text-gray-600'}>
            {data ? `${data.data?.length || 0} records` : 'No data'}
          </p>
        </div>
      </div>

      {/* Debug Log */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Debug Log</h2>
        <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
          {debugInfo.map((info, index) => (
            <div key={index} className="mb-2 text-sm">
              <span className="text-gray-500">{info.timestamp}</span>
              <span className="ml-2 font-medium">{info.message}</span>
              {info.data && (
                <pre className="mt-1 text-xs bg-white p-2 rounded overflow-x-auto">
                  {info.data}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Raw API Response */}
      {data && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Raw API Response</h2>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {/* Rendered Data Table */}
      {data?.data && data.data.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Rendered Data Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Suburb</th>
                  <th className="border border-gray-300 p-2 text-left">State</th>
                  <th className="border border-gray-300 p-2 text-center">Total Auctions</th>
                  <th className="border border-gray-300 p-2 text-center">Sold</th>
                  <th className="border border-gray-300 p-2 text-center">Clearance Rate</th>
                  <th className="border border-gray-300 p-2 text-right">Median Price</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((suburb: any) => (
                  <tr key={suburb.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-medium">{suburb.suburb}</td>
                    <td className="border border-gray-300 p-2">{suburb.state}</td>
                    <td className="border border-gray-300 p-2 text-center">{suburb.totalAuctions}</td>
                    <td className="border border-gray-300 p-2 text-center">{suburb.soldCount}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suburb.clearanceRate >= 70 ? 'bg-green-100 text-green-800' :
                        suburb.clearanceRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {suburb.clearanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {suburb.medianPrice ? `$${suburb.medianPrice.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Environment Information</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
          <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) + '...' : 'Server-side'}</p>
          <p><strong>Viewport:</strong> {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Server-side'}</p>
        </div>
      </div>
    </div>
  );
}