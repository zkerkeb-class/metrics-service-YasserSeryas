import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MetricChart = ({ 
  data, 
  type = 'line', 
  dataKey, 
  title,
  height = 300,
  color = '#3b82f6',
  showGrid = true,
  showLegend = true
}) => {
  const formatTooltip = (value, name) => {
    return [value, name];
  };

  const formatLabel = (label) => {
    if (label instanceof Date) {
      return label.toLocaleTimeString();
    }
    return label;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="timestamp" tickFormatter={formatLabel} />
            <YAxis />
            <Tooltip labelFormatter={formatLabel} formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={color} 
              fillOpacity={0.3}
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="timestamp" tickFormatter={formatLabel} />
            <YAxis />
            <Tooltip labelFormatter={formatLabel} formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="timestamp" tickFormatter={formatLabel} />
            <YAxis />
            <Tooltip labelFormatter={formatLabel} formatter={formatTooltip} />
            {showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricChart;
