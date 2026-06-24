import 'dotenv/config';
import { db } from './src/db';
import { systemSettings } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function seedSettings() {
  console.log('🌱 Seeding System Settings...');
  
  try {
    // 1. Listing Cost
    await db.insert(systemSettings).values({
      key: 'listing_cost_credits',
      value: '10',
      description: 'The number of credits deducted when a user publishes a new listing.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: '10' }
    });

    // 2. Social Links
    const socialLinks = JSON.stringify({
      twitter: 'https://twitter.com/tamleeq_sa',
      instagram: 'https://instagram.com/tamleeq_sa',
      linkedin: 'https://linkedin.com/company/tamleeq',
      whatsapp: '+966538498580',
      tiktok: 'https://tiktok.com/@tamleeq_sa',
      snapchat: 'https://snapchat.com/add/tamleeq_sa',
      youtube: 'https://youtube.com/@tamleeq_sa',
      facebook: 'https://facebook.com/tamleeq_sa'
    });
    await db.insert(systemSettings).values({
      key: 'social_links',
      value: socialLinks,
      description: 'Social media links displayed in the footer and contact pages.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: socialLinks }
    });

    // 3. Contact Info
    await db.insert(systemSettings).values({
      key: 'contact_phone',
      value: '+966 53 849 8580',
      description: 'Primary platform contact phone number.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: '+966 53 849 8580' }
    });

    await db.insert(systemSettings).values({
      key: 'contact_location',
      value: 'Riyadh, Saudi Arabia',
      description: 'Physical office address for footer.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: 'Riyadh, Saudi Arabia' }
    });

    await db.insert(systemSettings).values({
      key: 'contact_email',
      value: 'sales@tamleeq.sa',
      description: 'Primary platform contact email address.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: 'sales@tamleeq.sa' }
    });

    await db.insert(systemSettings).values({
      key: 'ai_qualification_webhook',
      value: '',
      description: 'N8N Webhook URL for lead qualification chat. Used on property detail pages.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'N8N Webhook URL for lead qualification chat. Used on property detail pages.' }
    });

    await db.insert(systemSettings).values({
      key: 'ai_project_qualification_webhook',
      value: '',
      description: 'N8N Webhook URL for project-level qualification chat. Used on project detail pages.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'N8N Webhook URL for project-level qualification chat. Used on project detail pages.' }
    });

    await db.insert(systemSettings).values({
      key: 'ai_general_assistant_webhook',
      value: '',
      description: 'N8N Webhook URL for the general website assistant chat (floating bubble).'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'N8N Webhook URL for the general website assistant chat (floating bubble).' }
    });

    // 6. Dynamic n8n Credentials
    await db.insert(systemSettings).values({
      key: 'n8n_webhook_secret',
      value: 'saudi_re_n8n_secure_webhook_secret_2026',
      description: 'Shared secret verified on n8n webhook entries.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'Shared secret verified on n8n webhook entries.' }
    });

    await db.insert(systemSettings).values({
      key: 'n8n_api_key',
      value: '',
      description: 'Authentication API key used to trigger programmatic actions in self-hosted n8n.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'Authentication API key used to trigger programmatic actions in self-hosted n8n.' }
    });

    // 7. Sidebar Dynamic Ad Banner
    await db.insert(systemSettings).values({
      key: 'sidebar_ad_image',
      value: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      description: 'The image URL for the listings sidebar dynamic ad banner.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' }
    });

    await db.insert(systemSettings).values({
      key: 'sidebar_ad_link',
      value: '/contact',
      description: 'The target redirect URL when clicking the sidebar ad banner.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: '/contact' }
    });

    await db.insert(systemSettings).values({
      key: 'sidebar_ad_aspect_ratio',
      value: 'auto',
      description: 'The aspect ratio mode for the listings sidebar ad banner (auto, 1_1, 3_4, 16_9).'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: 'auto' }
    });

    // 8. Platform Logo and Favicon Settings
    await db.insert(systemSettings).values({
      key: 'logo_url',
      value: '',
      description: 'The uploaded image URL of the platform brand logo.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'The uploaded image URL of the platform brand logo.' }
    });

    await db.insert(systemSettings).values({
      key: 'favicon_url',
      value: '',
      description: 'The uploaded image URL of the platform brand favicon.'
    }).onConflictDoUpdate({
      target: systemSettings.key,
      set: { description: 'The uploaded image URL of the platform brand favicon.' }
    });

    console.log('✅ Successfully seeded system settings');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedSettings();
