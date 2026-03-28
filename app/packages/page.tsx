import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PackagesClient } from '@/components/PackagesClient';
import type { Package } from '@/types';

export const metadata: Metadata = {
  title: 'Packages & Pricing',
  description: 'Choose the best plan for your exam preparation',
};

export default async function PackagesPage() {
  const packages = await query<Package>(
    'SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC'
  ).catch(() => []);

  const FALLBACK_PACKAGES: Partial<Package>[] = [
    {
      id: 1, name: 'SSC Starter', slug: 'ssc-starter', price: 299, discountedPrice: 199,
      validityDays: 90,
      features: ['50 SSC Mock Tests', 'Previous Year Papers', 'Section-wise Practice', 'Detailed Analysis'],
      description: 'Perfect for SSC CGL, CHSL, and other SSC exams',
    },
    {
      id: 2, name: 'Banking Pro', slug: 'banking-pro', price: 499, discountedPrice: 349,
      validityDays: 180,
      features: ['200 Banking Tests', 'SBI PO/Clerk Series', 'IBPS Complete Set', 'Current Affairs', 'Video Solutions'],
      description: 'Comprehensive prep for SBI, IBPS, RBI and all banking exams',
    },
    {
      id: 3, name: 'All Exams Premium', slug: 'all-exams-premium', price: 999, discountedPrice: 699,
      validityDays: 365,
      features: ['Unlimited Tests — All Exams', 'SSC + Banking + Railway + UPSC', 'Live Ranking', 'AI Performance Analysis', 'Priority Support', 'Download Tests'],
      description: 'The ultimate package for serious exam aspirants',
    },
  ];

  return (
    <>
      <Header />
      <main>
        <div className="bg-gradient-to-b from-brand-700 to-brand-600 text-white py-14 px-4 text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-blue-100 max-w-xl mx-auto">
            Invest in your future. Get unlimited access to premium mock tests and ace your dream exam.
          </p>
        </div>
        <PackagesClient packages={packages.length ? packages : FALLBACK_PACKAGES as Package[]} />
      </main>
      <Footer />
    </>
  );
}
