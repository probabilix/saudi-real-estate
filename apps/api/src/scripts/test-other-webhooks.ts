import 'dotenv/config';
import { db } from '../db';
import { crmLeads, crmActivities } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testOtherWebhooks() {
  const platform = process.argv[2]?.toUpperCase(); // 'TIKTOK' or 'SNAPCHAT'
  const mode = process.argv[3] || 'mock'; // 'mock' or 'live'

  if (!platform || (platform !== 'TIKTOK' && platform !== 'SNAPCHAT')) {
    console.error('❌ Error: Please specify the platform as the 2nd argument.');
    console.log('Usage:');
    console.log('  npx tsx src/scripts/test-other-webhooks.ts tiktok mock');
    console.log('  npx tsx src/scripts/test-other-webhooks.ts snapchat mock');
    process.exit(1);
  }

  if (mode === 'mock') {
    console.log(`🤖 Running Mock ${platform} Ads Webhook Ingestion...`);
    
    // Generate mock details
    const leadId = `mock_${platform.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`;
    const phone = `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
    const name = `Mock ${platform === 'TIKTOK' ? 'TikTok' : 'Snapchat'} Lead ${Math.floor(100 + Math.random() * 900)}`;
    const email = `mock_${platform.toLowerCase()}_${leadId}@example.com`;

    try {
      // Check for duplicate
      const [dup] = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1);
      
      const [lead] = await db.insert(crmLeads).values({
        source: platform as 'TIKTOK' | 'SNAPCHAT',
        name,
        phone,
        email,
        isDuplicate: !!dup,
        campaignDetails: {
          lead_id: leadId,
          campaign_name: `Mock ${platform} Conversion Campaign`,
          ad_set_name: `Adset ${platform} Riyadh`,
          form_id: `mock_form_${platform.toLowerCase()}_9900`,
          answers: {
            preferred_district: 'Al Malqa',
            budget_range: '1.2M - 1.5M SAR',
            whatsapp_number: phone
          }
        },
      }).returning();

      // Log activity
      await db.insert(crmActivities).values({
        leadId: lead.id,
        leadType: 'CAMPAIGN',
        activityType: 'CREATED',
        metadata: { source: platform, leadId },
      });

      console.log(`✅ Success! Mock ${platform} lead ingested successfully.`);
      console.log('-------------------------------------------');
      console.log(`ID:        ${lead.id}`);
      console.log(`Name:      ${name}`);
      console.log(`Phone:     ${phone}`);
      console.log(`Email:     ${email}`);
      console.log(`Duplicate: ${!!dup}`);
      console.log('-------------------------------------------');
      console.log('Open your CRM Leads dashboard to see the new lead!');
      process.exit(0);
    } catch (err) {
      console.error(`❌ Error during mock ingestion for ${platform}:`, err);
      process.exit(1);
    }
  } else {
    console.log(`📡 Live webhook testing for ${platform} requires active campaigns & webhook verification.`);
    console.log(`Once you are running active ads, here are the endpoints to register:`);
    console.log(`- TikTok Webhook Endpoint URL:  https://yourdomain.com/api/v1/crm/webhooks/tiktok`);
    console.log(`- Snapchat Webhook Endpoint URL: https://yourdomain.com/api/v1/crm/webhooks/snapchat`);
    process.exit(0);
  }
}

testOtherWebhooks();
