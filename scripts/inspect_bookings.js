const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_C3gSnKhO1sqr@ep-weathered-tree-b5x2ogwa-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function run() {
  const bookings = await sql`
    SELECT id, booking_number, total_amount, status, created_at 
    FROM bookings 
    ORDER BY created_at DESC
  `;
  console.log('--- ALL BOOKINGS STORED IN NEON DB ---');
  console.table(bookings);

  const total = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  console.log('Total Gross Revenue calculated by SQL SUM(total_amount): ₹' + total);
}

run().catch(console.error);
