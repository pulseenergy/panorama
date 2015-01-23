# panorama

Modern, modular projects tend to involve lots of repositories. Keeping an eye on them can be difficult.

Here's how Panorama helps:
- reviewing commits* from everyone in your organization
- visualizing cross-repository changes
- the build broke, but which dependency changed?

\* Panorama also shows comments, wiki changes, ...

## See it in action

http://panorama.pulseenergy.com


## Development

 1. [Create a GitHub app](https://github.com/settings/applications/new) with authorization callback URL `http://localhost:3456/auth/github/callback`
 1. Set environment variables `GITHUB_APP_ID` and `GITHUB_APP_SECRET` to whatever GitHub provides.
 1. `npm install`
 1. `npm start`
