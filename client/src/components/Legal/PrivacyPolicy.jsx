import React from 'react';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-indigo-300 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to App
          </a>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheckIcon className="w-4 h-4" />
            Google API Verified Compliant
          </div>
        </div>

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
            Privacy Policy & Terms of Service
          </h1>
          <p className="text-slate-400 text-sm">
            Last updated: September 8, 2026 • Application: <strong>AIMailAssistant</strong> (ai-mail-app.onrender.com)
          </p>
        </div>

        {/* Card Content */}
        <div className="space-y-8 text-slate-300 text-sm leading-relaxed bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. Introduction</h2>
            <p>
              AIMailAssistant ("we", "our", or "the application"), hosted at{' '}
              <a href="https://ai-mail-app.onrender.com" className="text-indigo-400 hover:underline">
                https://ai-mail-app.onrender.com
              </a>
              , is an intelligent email management platform designed to help users interact with their Google Gmail
              inbox through voice, text, and AI-assisted actions. We respect your privacy and are committed to protecting
              your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. Google User Data We Access & How We Use It</h2>
            <p className="mb-2">
              When you authenticate with your Google account via Google OAuth 2.0, AIMailAssistant requests access to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>Basic Profile & Email (<code>userinfo.email</code>, <code>userinfo.profile</code>)</strong>: Used
                solely to identify you and display your profile picture and name in the application header.
              </li>
              <li>
                <strong>Gmail API (<code>https://mail.google.com/</code>)</strong>: Used to fetch your email messages,
                threads, labels, search queries, and send messages on your behalf when explicitly triggered by you.
              </li>
            </ul>
            <p className="mt-2">
              We <strong>NEVER</strong> sell, rent, or transfer your Gmail data to data brokers, advertising platforms, or
              unauthorized third parties.
            </p>
          </section>

          <section className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-indigo-300 mb-2">
              3. Google API Services User Data Policy Compliance (Limited Use)
            </h2>
            <p className="text-indigo-100">
              AIMailAssistant's use and transfer to any other app of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold hover:text-white"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. Artificial Intelligence & Model Training Disclosures</h2>
            <p>
              AIMailAssistant incorporates AI capabilities (such as Google Gemini) to parse natural language commands,
              draft contextual replies, and summarize lengthy conversations.
            </p>
            <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 font-medium">
              ✓ Your email content, draft text, and contact information are <strong>NEVER used to train, retrain, or improve generalized foundational AI or Machine Learning models</strong>.
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. Data Storage, Security, & Retention</h2>
            <p>
              We implement industry-standard administrative, technical, and physical safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>All web traffic is encrypted end-to-end using TLS/HTTPS.</li>
              <li>OAuth access tokens are stored securely with cryptographic encryption.</li>
              <li>Cached email messages in MongoDB are strictly scoped by user ID with automated TTL deletion.</li>
              <li>Instant Demo Preview mode operates in an isolated environment with zero database storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. User Control & Access Revocation</h2>
            <p>
              You maintain complete control over your Google data at all times. You can disconnect AIMailAssistant and
              revoke all OAuth access immediately at:
            </p>
            <p className="mt-2">
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline font-medium"
              >
                Google Account Permissions (https://myaccount.google.com/permissions)
              </a>
            </p>
            <p className="mt-2">
              Logging out of the application immediately destroys active browser tokens.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Contact Information</h2>
            <p>
              If you have any questions, privacy inquiries, or data deletion requests, please contact the developer:
            </p>
            <p className="mt-2 font-medium text-white">
              Developer / Support Email:{' '}
              <a href="mailto:lishanthraa.1805@gmail.com" className="text-indigo-400 hover:underline">
                lishanthraa.1805@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          © 2026 AIMailAssistant. All rights reserved. • Built with Google Gemini & Gmail API.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
