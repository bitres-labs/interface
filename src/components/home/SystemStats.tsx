import { TrendingUp, Shield, DollarSign, Users } from 'lucide-react'

function SystemStats() {
  // Mock data - will be replaced with real data from contracts
  const stats = [
    {
      label: 'Total Value Locked',
      value: '$12.5M',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Collateral Ratio',
      value: '152.3%',
      icon: Shield,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      label: 'BTD Supply',
      value: '8.2M',
      icon: TrendingUp,
      color: 'text-btd-DEFAULT',
      bgColor: 'bg-btd-100',
    },
    {
      label: 'Active Users',
      value: '3,421',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="card border-l-4"
          style={{ borderLeftColor: stat.color.replace('text-', '#') }}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className={`text-xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
          <div className="text-xs text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

export default SystemStats
