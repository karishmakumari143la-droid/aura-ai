import { WebsiteProject } from '../types';

export const WEBSITE_TEMPLATES: Array<Omit<WebsiteProject, 'id' | 'createdAt'>> = [
  {
    name: 'Vanguard Fitness & Performance',
    category: 'gym',
    slug: 'vanguard-fitness',
    headline: 'Forge Elite Strength & Peak Physical Condition',
    description: 'Premier training sanctuary featuring Olympic-tier equipment, personalized nutrition, and biomechanical coaching.',
    pricing: [
      { name: 'Core Athlete', price: '$89', period: '/month', features: ['Unlimited Floor Access', 'Locker & Sauna Access', 'Mobile Booking App', '1 Monthly Body Composition Scan'] },
      { name: 'Performance Pro', price: '$149', period: '/month', features: ['All Core Features', '2 1-on-1 Personal Training Sessions', 'Full Group HIIT & Hyrox Classes', 'Custom Macro Blueprint'] },
      { name: 'Championship VIP', price: '$269', period: '/month', features: ['Unlimited 1-on-1 Coaching', 'Priority Recovery Suite & Cryo', 'Complimentary Performance Shakes', '24/7 Concierge Access'] }
    ],
    whatsappNumber: '+1 (555) 382-9901',
    whatsappCtaText: 'Claim Your Free VIP Pass on WhatsApp',
    contactEmail: 'memberships@vanguardgym.io',
    heroImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    sections: [
      { id: 'about', title: 'Why Vanguard', content: 'Engineered for dedicated athletes. We combine science-backed progressive overload programming with high-end recovery recovery lounges.' },
      { id: 'amenities', title: 'World-Class Facility', content: 'Eleiko calibrated plates, turf sprint tracks, cold plunges, infrared sauna suites, and in-house physical therapy.' },
      { id: 'trainers', title: 'Master Coaches', content: 'Our coaches hold CSCS certifications, former D1 athletic tenures, and national powerlifting titles.' }
    ],
    status: 'ready',
    seo: {
      metaTitle: 'Vanguard Fitness | Elite Gym & High-Performance Training',
      metaDescription: 'Join Vanguard Fitness. Experience Olympic lifting stations, personalized biomechanics coaching, and luxury sauna recovery.',
      keywords: ['elite gym', 'personal training', 'hyrox training', 'strength gym', 'sauna recovery']
    }
  },
  {
    name: 'Aura Dining & Botanical Bar',
    category: 'restaurant',
    slug: 'aura-dining',
    headline: 'Artisanal Culinary Experiences Rooted in Seasonality',
    description: 'Michelin-starred culinary philosophy honoring heirloom regional ingredients paired with biodynamic reserve wines.',
    pricing: [
      { name: 'Tasting Journey (5-Course)', price: '$135', period: '/guest', features: ['Seasonal 5-Course Chef Progression', 'Artisanal Bread & Cultured Butter', 'Botanical Pre-Dessert'] },
      { name: 'Grand Degustation (8-Course)', price: '$210', period: '/guest', features: ['Full 8-Course Chef Exploration', 'Rare Foraged Delicacies', 'Sommelier Table Welcome', 'Handmade Mignardises Box'] }
    ],
    whatsappNumber: '+1 (555) 789-2210',
    whatsappCtaText: 'Reserve Private Dining Table via WhatsApp',
    contactEmail: 'reservations@auradining.com',
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    sections: [
      { id: 'concept', title: 'Farm to Plate Philosophy', content: 'Every herb, cut, and reduction is sourced within 60 miles from certified regenerative micro-farms.' },
      { id: 'wine', title: 'Curated Cellar', content: 'Over 450 natural, low-intervention and rare vintage European bottles selected by our Master Sommelier.' }
    ],
    status: 'ready',
    seo: {
      metaTitle: 'Aura Dining | Modern Seasonal Gastronomy & Cocktail Lounge',
      metaDescription: 'Reserve your table at Aura Dining. A harmonious modern gastronomy journey of heirloom seasonal tasting menus.',
      keywords: ['fine dining', 'seasonal tasting menu', 'botanical cocktails', 'romantic dinner', 'wine bar']
    }
  },
  {
    name: 'Lumina Aesthetic Studio & Spa',
    category: 'salon',
    slug: 'lumina-spa',
    headline: 'Elevated Hair Design, Skincare & Restorative Wellness',
    description: 'Boutique hair styling, medical-grade skin therapy, and tranquil holistic treatments in a sanctuary setting.',
    pricing: [
      { name: 'Signature Blowout & Treatment', price: '$95', period: '/session', features: ['Scalp Detox Massage', 'Custom Keratin Infusion', 'Precision Styling'] },
      { name: 'Hydra-Glow Facial & LED', price: '$175', period: '/session', features: ['Deep Pore Ultrasonic Extraction', 'Peptide Infusion Serum', 'Medical Grade LED Phototherapy'] }
    ],
    whatsappNumber: '+1 (555) 902-1144',
    whatsappCtaText: 'Book VIP Appointment on WhatsApp',
    contactEmail: 'concierge@luminasalon.com',
    heroImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    sections: [
      { id: 'services', title: 'Curated Treatments', content: 'Balayage mastery, precision scissor sculpting, botanical facials, and bridal suites.' }
    ],
    status: 'ready',
    seo: {
      metaTitle: 'Lumina Aesthetic Studio | Luxury Hair & Skin Spa',
      metaDescription: 'Experience transformative hair design and clinical glowing skin treatments at Lumina Aesthetic Studio.',
      keywords: ['luxury salon', 'balayage specialist', 'hydrafacial', 'hair spa', 'aesthetic studio']
    }
  },
  {
    name: 'Sovereign Real Estate Advisory',
    category: 'real-estate',
    slug: 'sovereign-realty',
    headline: 'Exclusive Luxury Residences & Prime Coastal Estates',
    description: 'Representing discerning buyers and ultra-high-net-worth investors across premier global markets.',
    pricing: [
      { name: 'Buyer Representation', price: 'Bespoke', period: 'commission', features: ['Off-Market Pocket Listings', 'Private Jet Escorted Tours', 'Full Title & Valuation Audit'] },
      { name: 'Global Asset Listing', price: 'Bespoke', period: 'listing', features: ['Architectural Film Production', 'Targeted HNW Digital Media', 'Wall Street Journal Feature'] }
    ],
    whatsappNumber: '+1 (555) 441-8930',
    whatsappCtaText: 'Inquire for Off-Market Portfolios on WhatsApp',
    contactEmail: 'advisory@sovereignestates.com',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    sections: [
      { id: 'portfolio', title: 'Curated Portfolios', content: 'Penthouse collections, waterfront modern sanctuaries, and equestrian acreage.' }
    ],
    status: 'ready',
    seo: {
      metaTitle: 'Sovereign Real Estate | Luxury Homes & Coastal Estates',
      metaDescription: 'Discover premier luxury properties and private off-market estates curated by Sovereign Real Estate Advisory.',
      keywords: ['luxury real estate', 'off-market homes', 'penthouse listings', 'prime waterfront property']
    }
  }
];
