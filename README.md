A small tool to pull Gravatar profile info from the API, and process it to make it more human-friendly.

## Instructions
1. Clone this repository to your machine.
2. Obtain an [API key from Gravatar](https://gravatar.com/developers/new-application). Add it to `config.php`
3. Run PHP locally (`php -S localhost:8000` for example).
4. Open `localhost:8000` in your browser.

You'll see a text area where you can enter a list of usernames, one per line. After clicking `Fetch Profiles` you'll see a JSON with the raw info as provided by the API. You can then process and download the data with the `Download clean data` feature, and import that CSV in any spreadsheet software.
