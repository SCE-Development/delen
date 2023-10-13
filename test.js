const axios = require('axios');
const pee = "https://www.youtube.com/oembed";

async function updateSign(url) {
    try {
        const response = await axios.post(
            'http://192.168.69.143/api/update-sign',
            {
                'text': await getTitle(url),
                'scrollSpeed': '25',
                'backgroundColor': '#0000ff',
                'textColor': '#00ff00',
                'borderColor': '#ff0000',
                'email': 'sceadmin@sjsu.edu',
                'firstName': 'SCE'
            },
            {
                headers: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                }
            }
        );
    } catch (error) {
        throw error;
    }
}

async function getTitle(url) {
    try {
        const response = await axios.get(`${pee}?url=${encodeURIComponent(url)}`);
        return response.data.title;
    } catch (error) {
        throw error;
    }
}

// Example usage:
(async () => {
    const youtubeUrl = "https://www.youtube.com/watch?v=g4_ueTnlmCo&ab_channel=Medina-Topic";
    await updateSign(youtubeUrl);
})();
