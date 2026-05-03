# Security Policy

## Reporting a Security Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security issue, please email us at:

📧 **security@spotifyorganizer.dev**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your contact information (optional, for follow-up)

## What We Do

1. **Acknowledge receipt** within 24 hours
2. **Investigate** the issue thoroughly
3. **Develop a fix** as soon as possible
4. **Release a patch** (we'll aim for within 7 days for critical issues)
5. **Credit you publicly** (unless you prefer anonymity)

## Security Maintenance

### Supported Versions

| Version | Status | End of Life |
|---------|--------|------------|
| 1.x | Active | Until 2.0 release |
| 0.x | Bug fixes only | 2025-01-01 |

We recommend keeping your installation up-to-date. Security patches are provided for the current major version.

### Dependencies

- We keep dependencies updated regularly
- Automated updates via Dependabot
- Security advisories reviewed within 48 hours

## Security Best Practices

### Self-Hosted Users

1. **Keep secrets secure:**
   - Never commit `.env` files
   - Use strong `JWT_SECRET` (≥32 characters)
   - Rotate LLM API keys periodically

2. **Database security:**
   - Use `DATABASE_URL` with strong credentials
   - Enable password authentication
   - Restrict network access to PostgreSQL

3. **SSL/TLS:**
   - Always use HTTPS in production
   - Use valid SSL certificates (Let's Encrypt)
   - Set `SESSION_COOKIE_SECURE=true`

4. **Spotify OAuth:**
   - Keep `SPOTIFY_CLIENT_SECRET` private
   - Use `SPOTIFY_REDIRECT_URI` matching your domain
   - Don't commit Client Secret to version control

5. **Rate Limiting:**
   - Enable rate limiting (configured in `.env`)
   - Monitor for abuse
   - Consider using a WAF (Cloudflare, etc.)

### User Data Privacy

- ✅ We **never** collect or store user data
- ✅ Spotify tokens are **encrypted at rest** (AES-256)
- ✅ Tokens are **never** exposed to frontend
- ✅ All Spotify API calls proxied through **secure backend**
- ✅ LLM API keys **never** sent to browser
- ✅ **No telemetry** or analytics
- ✅ **No cross-user data sharing**

### Third-Party Dependencies

Be aware that this project depends on:
- **Fastify** – Backend framework
- **Next.js** – Frontend framework
- **Prisma** – ORM
- **BullMQ** – Job queue
- **LLM APIs** – Anthropic, OpenAI, Google (terms apply)

Review their security policies and practices.

## Known Vulnerabilities

None currently reported.

## Security Headers

For production deployments, we recommend:

```nginx
# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";

# X-Frame-Options
add_header X-Frame-Options "SAMEORIGIN";

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff";

# Strict-Transport-Security (HTTPS only)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

# Referrer-Policy
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

## Incident Response

If a security incident occurs:

1. We'll immediately assess severity
2. Create a private security advisory
3. Develop and test a fix
4. Release a patched version
5. Publish a security bulletin
6. Provide migration guidance

## Security Updates

Subscribe to security notifications:
- Watch [GitHub Security Advisories](https://github.com/akhileshpothuri/spotify-ai-organizer/security/advisories)
- Join our [Discord](https://discord.gg/spotify-organizer) for major announcements
- Check [CHANGELOG.md](./CHANGELOG.md) for release notes

## Questions?

If you have security questions or suggestions, contact **security@spotifyorganizer.dev**.

---

**Last updated:** May 3, 2024  
**Version:** 1.0
