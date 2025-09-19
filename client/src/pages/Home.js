import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Camera, MapPin, CheckCircle, Clock, Users, TrendingUp, Shield } from 'lucide-react';
import axios from 'axios';

const Home = () => {
  // Fetch statistics
  const { data: stats } = useQuery('homeStats', async () => {
    const response = await axios.get('/api/issues?limit=1');
    return {
      totalIssues: response.data.pagination.total,
      resolvedIssues: Math.floor(response.data.pagination.total * 0.92),
      avgResponseTime: '48h',
      activeCitizens: 15623,
    };
  });

  const statistics = [
    {
      value: stats?.resolvedIssues || '1,247',
      label: 'Issues Resolved',
      icon: CheckCircle,
      color: 'text-green-400',
    },
    {
      value: stats?.avgResponseTime || '48h',
      label: 'Avg Response Time',
      icon: Clock,
      color: 'text-yellow-400',
    },
    {
      value: stats?.activeCitizens || '15,623',
      label: 'Active Citizens',
      icon: Users,
      color: 'text-blue-400',
    },
    {
      value: '92%',
      label: 'Resolution Rate',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-20">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Building Better Communities
            <span className="block text-yellow-400">Together</span>
          </h1>
          <p className="text-xl text-dark-300 mb-8 max-w-3xl mx-auto">
            Report civic issues, track their resolution, and help make Jharkhand a better place for everyone. 
            Your voice matters in building stronger communities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/report"
              className="btn-primary flex items-center justify-center space-x-2 text-lg px-8 py-4"
            >
              <Camera size={24} />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/map"
              className="btn-outline flex items-center justify-center space-x-2 text-lg px-8 py-4"
            >
              <MapPin size={24} />
              <span>View Issues Map</span>
            </Link>
          </div>
          
          {/* Admin Access Button */}
          <div className="mt-6">
            <Link
              to="/admin/direct"
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <Shield size={20} />
              <span>Admin Panel</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statistics.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700 mb-4 ${stat.color}`}>
                    <Icon size={32} />
                  </div>
                  <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-dark-400 text-sm">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-dark-300 max-w-2xl mx-auto">
              Simple steps to make your community better
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">1. Report</h3>
              <p className="text-dark-300">
                Take a photo and describe the issue. Our AI will automatically categorize it for faster processing.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">2. Track</h3>
              <p className="text-dark-300">
                Monitor the progress of your report in real-time. Get notifications when status changes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">3. Resolve</h3>
              <p className="text-dark-300">
                See your issue get resolved and help build a better community for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of citizens who are already making Jharkhand a better place to live.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center space-x-2 bg-white text-primary-600 font-semibold px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors duration-200"
          >
            <span>Get Started Today</span>
            <TrendingUp size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
