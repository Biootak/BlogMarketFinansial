import React from 'react';
import WelcomeSectionBackground from './WelcomeSectionBackground';
import WelcomeSectionContent from './WelcomeSectionContent';

export default function WelcomeSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
      <WelcomeSectionBackground />
      <WelcomeSectionContent />
    </div>
  );
}
