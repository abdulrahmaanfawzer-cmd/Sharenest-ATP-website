/* Sharenest — Supabase client setup.
   Uses the Supabase CDN bundle (loaded in index.html as the global `supabase`),
   so no npm install / build step is needed for this static site.

   Exposes window.sharenestSupabase — null if not configured yet,
   so the rest of the app can fall back to local demo data safely. */

var sharenestSupabase = null;

(function () {
  if (typeof supabase === 'undefined') {
    console.warn('Sharenest: Supabase library did not load (check your internet connection / CDN).');
    return;
  }
  var configured =
    SHARENEST_SUPABASE_URL &&
    SHARENEST_SUPABASE_KEY &&
    SHARENEST_SUPABASE_URL.indexOf('YOUR_') !== 0 &&
    SHARENEST_SUPABASE_KEY.indexOf('YOUR_') !== 0;

  if (!configured) {
    console.warn('Sharenest: add your Supabase URL and key in config.js to enable live data. Using local demo data for now.');
    return;
  }

  sharenestSupabase = supabase.createClient(SHARENEST_SUPABASE_URL, SHARENEST_SUPABASE_KEY);
})();
