import 'dotenv/config';
import { db } from '../db';
import { crmLeads, crmActivities, systemSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testMetaWebhook() {
  const mode = process.argv[2] || 'mock'; // 'mock' or 'live'

  if (mode === 'mock') {
    console.log('🤖 Running Mock Meta Ads Webhook Ingestion...');
    
    // Generate a unique phone number and ID for testing
    const leadgenId = `mock_${Math.floor(100000 + Math.random() * 900000)}`;
    const phone = `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
    const name = `Mock Lead ${Math.floor(100 + Math.random() * 900)}`;
    const email = `mock_lead_${leadgenId}@example.com`;

    try {
      // Check for duplicate
      const [dup] = await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1);
      
      const [lead] = await db.insert(crmLeads).values({
        source: 'META_ADS',
        name,
        phone,
        email,
        isDuplicate: !!dup,
        campaignDetails: {
          leadgen_id: leadgenId,
          campaign_name: 'Mock Riyadh Luxury Villa Campaign',
          ad_set_name: 'Adset Riyadh North',
          form_id: 'mock_form_7788',
          page_id: 'mock_page_9900',
        },
      }).returning();

      // Log activity
      await db.insert(crmActivities).values({
        leadId: lead.id,
        leadType: 'CAMPAIGN',
        activityType: 'CREATED',
        metadata: { source: 'META_ADS', leadgenId },
      });

      console.log('✅ Success! Mock lead ingested successfully.');
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
      console.error('❌ Error during mock ingestion:', err);
      process.exit(1);
    }
  } else if (mode === 'live') {
    const leadgenId = process.argv[3];
    if (!leadgenId) {
      console.error('❌ Error: Please specify a leadgen_id as the 3rd argument.');
      console.log('Usage: npx tsx src/scripts/test-meta-webhook.ts live <leadgen_id>');
      process.exit(1);
    }

    console.log(`📡 Fetching live leadgen details from Meta Graph API for ID: ${leadgenId}...`);

    try {
      // Fetch page access token from settings
      const [pageSetting] = await db.select().from(systemSettings)
        .where(eq(systemSettings.key, 'META_PAGE_ACCESS_TOKEN')).limit(1);
      const pageToken = pageSetting?.value;

      if (!pageToken) {
        console.error('❌ Error: META_PAGE_ACCESS_TOKEN is not configured in system settings.');
        console.log('Please insert the token into the database before running this live test.');
        process.exit(1);
      }

      // Fetch from Meta Graph API with explicit fields
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${leadgenId}?fields=id,created_time,field_data,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,form_id&access_token=${pageToken}`
      );
      if (!metaRes.ok) {
        const errorText = await metaRes.text();
        console.error(`❌ Meta Graph API responded with error: ${metaRes.status}`);
        console.error(errorText);
        process.exit(1);
      }

      const metaData = await metaRes.json();
      console.log('🔍 Meta Data Received:', JSON.stringify(metaData, null, 2));

      const fields: Record<string, string> = {};
      for (const f of (metaData.field_data ?? [])) {
        fields[f.name] = f.values?.[0] ?? '';
      }

      const name  = fields['full_name'] || (fields['first_name'] ? `${fields['first_name'] ?? ''} ${fields['last_name'] ?? ''}`.trim() : '') || 'Unknown Live Lead';
      let phone = fields['phone_number'] || fields['phone'] || '';
      if (phone.length > 30) {
        phone = phone.substring(0, 30);
      }
      const email = fields['email'] || null;

      if (!phone && !email) {
        console.error('❌ Error: Extracted phone and email are both empty. Cannot ingest.');
        process.exit(1);
      }

      // Check duplicate
      const [dup] = phone
        ? await db.select({ id: crmLeads.id }).from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1)
        : [];

      // Look up ad creative if ad_id is present
      let facebookPostUrl = '';
      let instagramPostUrl = '';
      const adId = metaData.ad_id;
      if (adId) {
        try {
          console.log(`🔗 Looking up ad creative for Ad ID: ${adId}...`);
          const adRes = await fetch(
            `https://graph.facebook.com/v19.0/${adId}?fields=creative&access_token=${pageToken}`
          );
          if (adRes.ok) {
            const adData = await adRes.json();
            const creativeId = adData.creative?.id;
            if (creativeId) {
              const creativeRes = await fetch(
                `https://graph.facebook.com/v19.0/${creativeId}?fields=effective_object_story_id,instagram_permalink_url&access_token=${pageToken}`
              );
              if (creativeRes.ok) {
                const creativeData = await creativeRes.json();
                if (creativeData.effective_object_story_id) {
                  facebookPostUrl = `https://facebook.com/${creativeData.effective_object_story_id}`;
                }
                if (creativeData.instagram_permalink_url) {
                  instagramPostUrl = creativeData.instagram_permalink_url;
                }
              }
            }
          }
        } catch (adErr) {
          console.error('⚠️ Error fetching ad creative:', adErr);
        }
      }

      const [lead] = await db.insert(crmLeads).values({
        source: 'META_ADS',
        name,
        phone,
        email,
        isDuplicate: !!dup,
        campaignDetails: {
          leadgen_id: leadgenId,
          campaign_name: metaData.campaign_name || 'Live Test Campaign',
          ad_set_name: metaData.adset_name || 'Live Test Adset',
          ad_name: metaData.ad_name || 'Live Test Ad',
          ad_id: adId || '',
          form_id: metaData.form_id || 'live_test_form',
          page_id: 'live_test_page',
          facebook_post_url: facebookPostUrl,
          instagram_post_url: instagramPostUrl,
          answers: fields, // Store the custom form responses!
        },
      }).returning();

      // Log activity
      await db.insert(crmActivities).values({
        leadId: lead.id,
        leadType: 'CAMPAIGN',
        activityType: 'CREATED',
        metadata: { source: 'META_ADS', leadgenId },
      });

      console.log('✅ Success! Live Meta lead ingested successfully.');
      console.log('-------------------------------------------');
      console.log(`ID:        ${lead.id}`);
      console.log(`Name:      ${name}`);
      console.log(`Phone:     ${phone}`);
      console.log(`Email:     ${email}`);
      console.log(`Duplicate: ${!!dup}`);
      console.log('-------------------------------------------');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during live ingestion:', err);
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/test-meta-webhook.ts mock');
    console.log('  npx tsx src/scripts/test-meta-webhook.ts live <leadgen_id>');
    process.exit(0);
  }
}

testMetaWebhook();
