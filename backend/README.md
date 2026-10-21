# Planned Studio backend

No backend service is implemented in this baseline. This directory reserves the
location for the new Django application; it contains no legacy server code.

Follow the [delivery plan](../docs/rebuild/plan.md). The next backend increment
introduces PostgreSQL, the initial user/identity model, sessions, migrations and a
health endpoint. SAML login, private projects, a versioned Data catalogue and
central simulation dispatch follow as separately checked increments.

Studio owns authentication, account permissions, application records and job
scheduling. The future worker calls installed EPSM packages through public APIs;
it does not reimplement their calculations. Add queue and worker code only at the
simulation milestones. Credentials, private keys and runtime files stay outside
source and images.

There is no server command, Python dependency environment or database migration
to run yet. The frontend prototype runs independently with browser storage and
clearly labelled demonstration data.
