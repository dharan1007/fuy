const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://yaxmyqzfywgicddurzlx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlheG15cXpmeXdnaWNkZHVyemx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5OTQ3MzIsImV4cCI6MjA3NzU3MDczMn0.yoqMmwvtLNKVWnqEUCEKsW6WU7o0Sx5UCLYT_4SSzjo'
);

async function checkClocks() {
    console.log('Checking Clocks...');
    const { data, error } = await supabase
        .from('Post')
        .select('id, content, postType, clockData, createdAt')
        .eq('postType', 'CLOCK')
        .order('createdAt', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found Clocks:', data.length);
    const now = new Date();
    console.log('Current Time:', now.toISOString());

    data.forEach(post => {
        console.log('---');
        console.log('ID:', post.id);
        console.log('Created:', post.createdAt);
        console.log('ClockData:', JSON.stringify(post.clockData, null, 2));

        // Check expiry logic locally
        let expiresAt = post.clockData?.expiresAt;
        if (!expiresAt) {
            const created = new Date(post.createdAt).getTime();
            expiresAt = new Date(created + 24 * 60 * 60 * 1000).toISOString();
            console.log('Warning: No expiresAt, using default 24h');
        }

        console.log('ExpiresAt:', expiresAt);
        const isExpired = new Date(expiresAt) <= now;
        console.log('Is Expired?', isExpired);

        if (isExpired) {
            console.log('REASON: This post is EXPIRED and should NOT show.');
        } else {
            console.log('REASON: This post is VALID and SHOULD show.');
        }
    });
}

checkClocks();
