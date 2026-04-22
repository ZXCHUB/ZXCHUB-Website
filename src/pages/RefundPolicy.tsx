import React from 'react';
import Navbar from '../components/Navbar';

export default function RefundPolicy() {
  return (
    <div className="w-full">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-32">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Refund <span className="text-indigo-400">Policy</span>
          </h1>
        </div>

        <div className="bg-[#1A1D24] border border-zinc-800/50 rounded-2xl p-8 md:p-12 shadow-xl">
          <div className="prose prose-invert max-w-none prose-p:text-zinc-300 prose-headings:text-white prose-a:text-indigo-400">
            <p className="text-lg leading-relaxed">
              Refunds are <strong>not guaranteed</strong> and are issued <strong>only</strong> at the sole discretion of RumbleHub, and only in cases involving major, unresolvable technical issues.
            </p>
            <p className="text-lg leading-relaxed">
              Refund requests without valid justification will be <strong>denied</strong>.
            </p>
            <p className="text-lg leading-relaxed text-red-400 font-medium">
              Any chargeback, dispute, or unauthorized refund attempt will result in a permanent ban and blacklisting.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
