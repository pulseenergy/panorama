# panorama

Modern, modular projects tend to involve lots of repositories. Keeping an eye on them can be difficult.

Here's how Panorama helps:
- reviewing commits* from everyone in your organization
- visualizing cross-repository changes
- the build broke, but which dependency changed?

\* Panorama also shows comments, wiki changes, ...

## See it in action

![Panorama screenshot](https://cloud.githubusercontent.com/assets/438545/10493836/1c48a958-7268-11e5-9e92-7099e76f2052.png)



http://panorama.pulseenergy.com


## Development

 1. [Create a GitHub app](https://github.com/settings/applications/new) with authorization callback URL `http://localhost:3456/auth/github/callback`
 1. Set environment variables `GITHUB_APP_ID` and `GITHUB_APP_SECRET` to whatever GitHub provides.
 1. `npm install`
 1. `npm start`
