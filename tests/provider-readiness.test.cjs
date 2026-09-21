const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('scripts/provider-readiness-audit.cjs','utf8');
test('provider readiness audit is GET-only and gated',()=>{
 assert.match(src,/ALLOW_PRODUCTION_PROVIDER_AUDIT/);
 assert.match(src,/method:'GET'/);
 assert.doesNotMatch(src,/method:'POST'|method:"POST"|\/emails'|Messages\.json/);
 assert.doesNotMatch(src,/console\.log\([^\n]*(resendApiKey|twilioAuthToken|STRIPE_SECRET_KEY)/);
});
test('provider readiness output is aggregate only',()=>{
 assert.match(src,/stripeConnect:bucket\(\)/);
 assert.match(src,/resend:bucket\(\)/);
 assert.match(src,/twilio:bucket\(\)/);
 assert.doesNotMatch(src,/select:\{[^}]*name:true|select:\{[^}]*contactEmail:true/);
});
