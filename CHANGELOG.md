# Changelog

# 0.3.1

_Release 08/09/2023_

#### Fixes

- Fix missing automatic camera selection on first time run.

# 0.3.0

_Release 08/09/2023_

#### Features

- [DELEGATE] - Implement handling of "external, incoming" NIP-46 delegation requests according to spec.
- [NIP-46 Test App] - Add **manual flow** where you have separate buttons for triggering the following requests: `describe`, `get_public_key`, `sign_event` and `delegate`.

#### Fixes

- [SIGN_EVENT] - Correctly set the signer pubkey in the event before signing.

# 0.2.2

_Release 08/06/2023_

#### Features

- [GET_PUBLIC_KEY] - Make a delegator (pubkey) selectable even when the delegator identity has been deleted (a delegation with this delegator is still active).

# Changelog

# 0.2.1

_Release 08/06/2023_

#### Features

- Add delegation usage to event signing.

# Changelog

# 0.2.0

_Release 08/04/2023_

#### Features

- Added management of delegations (create, view, delete). Still missing the usage inside event signing.

# Changelog

# 0.1.2

_Release 07/29/2023_

#### Features

- Added an app view when clicking on an app.

# Changelog

# 0.1.1

_Release 07/25/2023_

#### Features

- Add preview data (image and meta data).

# 0.1.0

_Release 07/24/2023_

#### Features

- [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) signer implementation that serves **get_public_key** and **sign_event** requests.
- Key storage either in IndexedDb (thereby encrypting the secret keys) or external via [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) browser extension.
- For testing purposes: NIP-46 app implementation.
