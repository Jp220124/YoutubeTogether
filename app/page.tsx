'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'react-feather';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CreateRoomModal from '@/components/room/CreateRoomModal';
import JoinRoomModal from '@/components/room/JoinRoomModal';

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: 'ease-out-cubic',
      once: true
    });
  }, []);

  return (
    <div className="min-h-screen">
      <style jsx global>{`
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #e0f7fa 0%, #f8bbd0 100%);
          color: #333;
        }
        .card-hover:hover {
          transform: translateY(-10px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .feature-card {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        .feature-card:hover {
          transform: translateY(-10px) scale(1.03);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .gradient-text {
          background: linear-gradient(90deg, #4a148c 0%, #ff6f00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-bg {
          background: radial-gradient(circle at top right, rgba(168, 230, 255, 0.5), transparent 40%),
                      radial-gradient(circle at 20% 80%, rgba(255, 188, 224, 0.5), transparent 40%);
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero-bg min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Icons.Youtube className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold text-gray-800">WatchTube</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-orange-600 transition">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-orange-600 transition">How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-orange-600 transition">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-orange-600 transition">Contact</a>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <section className="flex-grow flex items-center pt-10 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-7xl font-bold mb-6 leading-tight text-gray-800" data-aos="fade-up">
              Watch YouTube <span className="gradient-text">Together</span> in Real-Time
            </h1>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-600" data-aos="fade-up" data-aos-delay="100">
              Sync videos with friends, family, or colleagues anywhere in the world. No downloads required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16" data-aos="fade-up" data-aos-delay="200">
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-2 pulse-animation transform hover:scale-105 transition"
              >
                <Icons.PlayCircle className="w-5 h-5" />
                Start Watching Now
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white bg-opacity-70 backdrop-blur-sm border border-gray-200 hover:bg-opacity-90 text-gray-800 px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-2 transform hover:scale-105 transition"
              >
                <Icons.Users className="w-5 h-5" />
                Create Room
              </button>
            </div>

            {/* Video Preview Placeholder */}
            <div className="max-w-4xl mx-auto" data-aos="fade-up" data-aos-delay="300">
              <div className="bg-white bg-opacity-70 rounded-2xl p-8 backdrop-blur-sm border border-gray-200">
                <div className="aspect-video bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <Icons.Play className="w-20 h-20 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-800">Why WatchTube?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Experience seamless video watching with these powerful features</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card p-8" data-aos="fade-up">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Icons.Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Real-Time Sync</h3>
              <p className="text-gray-600">All participants watch the same video at exactly the same time, no matter where they are.</p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card p-8" data-aos="fade-up" data-aos-delay="100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                <Icons.MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Live Chat</h3>
              <p className="text-gray-600">Communicate with your group through our integrated live chat while watching videos.</p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card p-8" data-aos="fade-up" data-aos-delay="200">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Icons.Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Multi-Device Support</h3>
              <p className="text-gray-600">Works seamlessly on desktop, tablet, and mobile devices for maximum accessibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white bg-opacity-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-800">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Get started in just three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center" data-aos="fade-up">
              <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">1</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Create a Room</h3>
              <p className="text-gray-600">Start by creating a new viewing room and get a unique shareable link.</p>
            </div>

            {/* Step 2 */}
            <div className="text-center" data-aos="fade-up" data-aos-delay="100">
              <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">2</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Share the Link</h3>
              <p className="text-gray-600">Send the room link to friends, family, or colleagues to join you.</p>
            </div>

            {/* Step 3 */}
            <div className="text-center" data-aos="fade-up" data-aos-delay="200">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">3</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Start Watching</h3>
              <p className="text-gray-600">Paste any YouTube URL and start watching together in perfect sync.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #b39ddb 0%, #f48fb1 100%)' }}>
        <div className="max-w-4xl mx-auto text-center bg-white bg-opacity-90 rounded-3xl p-12 border border-gray-100" data-aos="fade-up">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-800">Ready to Watch Together?</h2>
          <p className="text-xl text-gray-700 mb-10">Join thousands of users who watch YouTube together every day</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-10 py-5 rounded-full text-xl font-semibold flex items-center justify-center gap-3 mx-auto pulse-animation transform hover:scale-105 transition"
          >
            <Icons.Play className="w-6 h-6" />
            Start Your First Session
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 bg-white bg-opacity-80">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Icons.Youtube className="w-6 h-6 text-red-500" />
                <span className="text-xl font-bold text-gray-800">WatchTube</span>
              </div>
              <p className="text-gray-600">Bringing people together through shared video experiences since 2023.</p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Help Center</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Contact Us</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-800 transition">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 mt-12 pt-8 text-center text-gray-700">
            <p>&copy; 2023 WatchTube. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
        {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} />}
      </AnimatePresence>
    </div>
  );
}