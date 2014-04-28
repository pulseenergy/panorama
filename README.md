# panorama

GitHub client for viewing all the things (you care about).

[See it in action](http://panorama.pulseenergy.com)

## Development

 1. [Create a GitHub app](https://github.com/settings/applications/new) with authorization callback URL `http://localhost:3456/auth/github/callback`
 1. Set environment variables `GITHUB_APP_ID` and `GITHUB_APP_SECRET` to whatever GitHub provides.
 1. `npm start`
