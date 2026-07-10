'use client';

import { useEffect, useState } from 'react';
import { Accordion, AccordionItem } from '@heroui/react';
import { getFaqs, IFaqItem } from '@/app/api/faq';

const FaqPage = () => {
  const [faqs, setFaqs] = useState<IFaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await getFaqs();
        setFaqs(data);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, IFaqItem[]>);

  // Sort each category by sortOrder
  Object.keys(groupedFaqs).forEach((category) => {
    groupedFaqs[category].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl min-h-[calc(100vh-200px)]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Frequently Asked Questions</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">No FAQs available</h3>
          <p className="mt-1 text-gray-500">Please check back later.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFaqs).map(([category, items]) => (
            <div key={category} className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 px-2">{category}</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <Accordion variant="light" className="px-4 py-2">
                  {items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      aria-label={item.question}
                      title={<span className="font-semibold text-gray-800 text-base">{item.question}</span>}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-gray-600 pb-4 leading-relaxed">
                        {item.answer}
                      </div>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FaqPage;
