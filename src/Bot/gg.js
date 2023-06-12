let fetch;

import('node-fetch').then(nodeFetch => {
    fetch = nodeFetch.default;
    main();  // calling main function after fetch is defined.
});

async function main() {
    const url = 'https://top.gg/api/bots/1105598736551387247/check?userId=385324994533654530';
    const options = {
        method: 'GET',
        headers: {
            'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMDU1OTg3MzY1NTEzODcyNDciLCJib3QiOnRydWUsImlhdCI6MTY4NjU5ODIwNH0.N6KsGwiWY-RhALqC0f5VidMD2ZhH2m8fRpaWMeiBnq4'
        }
    };

    try {
        const response = await fetch(url, options);

        // Check if the request was successful
        if (response.ok) {
            const data = await response.json();
            console.log(data);
        } else {
            // If the request failed, throw an error
            const error = new Error(`HTTP Error: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            throw error;
        }
    } catch (error) {
        console.error(`Error: ${error.status} ${error.message}`);
        console.error(`Response Headers: ${JSON.stringify(Array.from(error.response.headers.entries()))}`);
    }
}
