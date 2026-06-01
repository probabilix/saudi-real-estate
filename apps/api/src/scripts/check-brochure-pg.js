const { Client } = require('pg');

async function checkBrochure() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_Gk4K1cFBeIjJ@ep-square-fire-ag4pezs3-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    await client.connect();
    const res = await client.query("SELECT brochure_url, is_featured, featured_until FROM listings WHERE id = 'ab39caca-855d-4b13-878d-97ba2587071a'");
    console.log('Result:', JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkBrochure();
