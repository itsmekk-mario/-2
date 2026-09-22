import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { DataPoint, MajorMode, ShoulderUserConfig } from '../types';
import { LineChart as ChartIcon, Target, ShieldAlert } from 'lucide-react';

interface LiveChartProps {
  history: DataPoint[];
  majorMode: MajorMode;
  shoulderConfig?: ShoulderUserConfig;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  history,
  majorMode,
  shoulderConfig,
}) => {
  // Keep last 45 data points for real-time smooth display
  const chartData = history.slice(-45);

  const leftLabel = majorMode === 'knee' ? '좌측 무릎 (Left)' : '좌측 어깨 (Left)';
  const rightLabel = majorMode === 'knee' ? '우측 무릎 (Right)' : '우측 어깨 (Right)';

  return (
    <div className="bg-white border border-[#DEDECF] rounded-[28px] p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ChartIcon className="w-4 h-4 text-[#FF6321]" />
          <h3 className="text-xs font-bold text-[#2D2D24] uppercase tracking-wider">
            시계열 관절 가동범위 실시간 변화 (Real-Time ROM Time-Series)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-1 rounded-full bg-[#FF6321]" />
            <span className="text-[#5A5A40]">{leftLabel}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-1 rounded-full bg-[#3E5C38]" />
            <span className="text-[#5A5A40]">{rightLabel}</span>
          </span>
          {majorMode === 'shoulder' && shoulderConfig?.targetROM && (
            <span className="flex items-center space-x-1 text-emerald-700">
              <span className="w-2.5 h-0.5 border-t border-dashed border-emerald-600" />
              <span>목표 ROM ({shoulderConfig.targetROM}°)</span>
            </span>
          )}
          {majorMode === 'shoulder' && shoulderConfig?.maximumAllowedROM && (
            <span className="flex items-center space-x-1 text-red-600">
              <span className="w-2.5 h-0.5 border-t border-dashed border-red-500" />
              <span>제한 ROM ({shoulderConfig.maximumAllowedROM}°)</span>
            </span>
          )}
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-56 sm:h-64">
        {chartData.length === 0 ? (
          <div className="w-full h-full bg-[#FDFDFB] rounded-2xl border border-[#F0F0E8] flex items-center justify-center text-[#8A8A70] text-xs font-mono">
            카메라가 활성화되면 실시간 각도 궤적이 시각화됩니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8DF" />
              <XAxis
                dataKey="time"
                stroke="#8A8A70"
                tickFormatter={(val) => `${val.toFixed(0)}s`}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                stroke="#8A8A70"
                domain={[0, majorMode === 'knee' ? 140 : 180]}
                tickFormatter={(val) => `${val}°`}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DEDECF',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`${Number(val).toFixed(1)}°`]}
              />

              {/* Target ROM Reference Line */}
              {majorMode === 'shoulder' && shoulderConfig?.targetROM && (
                <ReferenceLine
                  y={shoulderConfig.targetROM}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: `목표 ${shoulderConfig.targetROM}°`,
                    fill: '#059669',
                    fontSize: 10,
                    position: 'right',
                  }}
                />
              )}

              {/* Maximum Allowed ROM Reference Line */}
              {majorMode === 'shoulder' && shoulderConfig?.maximumAllowedROM && (
                <ReferenceLine
                  y={shoulderConfig.maximumAllowedROM}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{
                    value: `제한 ${shoulderConfig.maximumAllowedROM}°`,
                    fill: '#DC2626',
                    fontSize: 10,
                    position: 'right',
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="leftAngle"
                name={leftLabel}
                stroke="#FF6321"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="rightAngle"
                name={rightLabel}
                stroke="#3E5C38"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
