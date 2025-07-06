'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API...');
        const response = await fetch('/api/suburbs?limit=5');
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const text = await response.text();
        console.log('Raw response:', text);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = JSON.parse(text);
        console.log('Parsed data:', data);
        setApiData(data);
      } catch (err) {
        console.error('API Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">API Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
        </div>

        {apiData && (
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2">API Response</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
        )}

        {apiData?.data && (
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2">Suburbs Data</h2>
            {apiData.data.map((suburb: any, index: number) => (
              <div key={suburb.id} className="mb-2 p-2 bg-gray-50 rounded">
                <p><strong>{suburb.suburb}, {suburb.state}</strong></p>
                <p>Total Auctions: {suburb.totalAuctions}</p>
                <p>Sold: {suburb.soldCount}</p>
                <p>Clearance Rate: {suburb.clearanceRate.toFixed(1)}%</p>
                <p>Median Price: {suburb.medianPrice ? `$${suburb.medianPrice.toLocaleString()}` : 'N/A'}</p>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Environment Info</h2>
          <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'Server side'}</p>
          <p>User Agent: {typeof window !== 'undefined' ? navigator.userAgent : 'Server side'}</p>
        </div>
      </div>
    </div>
  );
}