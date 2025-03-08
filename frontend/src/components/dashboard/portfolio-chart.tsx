import { Card, CardContent } from '@/src/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const MOCK_DATA = [
  { date: '2024-03-01', value: 3400 },
  { date: '2024-03-02', value: 3800 },
  { date: '2024-03-03', value: 3900 },
  { date: '2024-03-04', value: 3850 },
  { date: '2024-03-05', value: 4000 },
  { date: '2024-03-06', value: 4200 },
].map((item) => ({
  ...item,
  formattedDate: new Date(item.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }),
}));

export function PortfolioChart() {
  return (
    <Card>
      <div className="px-6 py-4 mb-4 bg-muted/50">
        <h2 className="text-2xl font-semibold">Portfolio Value (Mock Data)</h2>
      </div>
      <div className="h-[1px] mx-6 bg-border" />
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={MOCK_DATA}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888888', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888888', fontSize: 12 }}
                dx={-10}
                domain={[2000, 6000]}
                ticks={[2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
