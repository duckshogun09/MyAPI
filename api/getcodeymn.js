export default {
  async fetch(request, env, ctx) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return new Response(JSON.stringify({ error: 'Thiếu tham số type' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const targetUrl = 'https://ymn.kingcrtis1.workers.dev/bypass?type=' + encodeURIComponent(type);

    const res = await fetch(targetUrl);
    const body = await res.text();

    return new Response(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}
