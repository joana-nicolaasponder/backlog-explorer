import React from 'react';

const PrivacyPolicy: React.FC = () => (
  <div className="max-w-2xl mx-auto py-12 px-4">
    <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
    <p className="mb-4">Effective date: July 15, 2025</p>
    <p className="mb-4">
      Backlog Explorer ("the app") respects your privacy. This policy explains what data we collect, how we use it, and your rights.
    </p>
    <h2 className="text-xl font-semibold mt-6 mb-2">1. Data We Collect</h2>
    <ul className="list-disc list-inside mb-4">
      <li>Email address (for account creation and login)</li>
      <li>Game library data you add</li>
      <li>Feedback you submit</li>
      <li>Usage data (for analytics and improvement)</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Data</h2>
    <ul className="list-disc list-inside mb-4">
      <li>To provide and improve the app</li>
      <li>To communicate with you about your account</li>
      <li>To respond to your feedback or support requests</li>
      <li>To comply with legal obligations</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">3. Data Sharing</h2>
    <p className="mb-4">
      We do not sell your data. We may share data with service providers (e.g., Supabase) as needed to operate the app, or if required by law.
    </p>
    <h2 className="text-xl font-semibold mt-6 mb-2">4. Your Rights</h2>
    <ul className="list-disc list-inside mb-4">
      <li>You can access, update, or delete your account at any time.</li>
      <li>Contact us to request data deletion or ask privacy questions.</li>
    </ul>
    <h2 className="text-xl font-semibold mt-6 mb-2">5. Contact</h2>
    <p>
      For privacy questions or requests, email <a href="mailto:joanaponder@gmail.com" className="underline">joanaponder@gmail.com</a>.
    </p>
  </div>
);

export default PrivacyPolicy;
