import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

// Ensure we don't try to use env vars that might not exist in the node environment directly,
// just fetching the CSV for now.
async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/12iBlekspXJSkDkK5PYW9cGTLJ8iHd4DY-0TrVnEp8Mo/export?format=csv'
  const res = await fetch(url)
  const text = await res.text()
  
  console.log("CSV Lines:", text.split('\n').length)
  console.log("CSV Preview:\n", text.substring(0, 300))
}
test()
