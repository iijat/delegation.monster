import { KeyValue } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import {
  Kind,
  Nip46App,
  Nip46AppEvent,
  Nip46DelegateRequestParams,
  Nip46Uri,
  generatePrivateKey,
  getPublicKey,
  verifySignature,
} from '@iijat-sw/nip46';
import { EventTemplate } from 'nostr-tools';
import { Subject, Subscription } from 'rxjs';
import { Nip46Log } from 'src/app/common/signerLog';
import { sleep } from 'src/app/common/sleep';
import { MixedService } from 'src/app/services/mixed.service';
import { nip26 } from 'nostr-tools';
import { DateTime } from 'luxon';

class ManualFlowConfig {
  delegatePrivkey: string;
  get delegatePubkey() {
    return getPublicKey(this.delegatePrivkey);
  }

  constructor() {
    this.delegatePrivkey = generatePrivateKey();
  }

  regenerateDelegatePrivkey() {
    this.delegatePrivkey = generatePrivateKey();
  }
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'delmo-debug',
  templateUrl: './debug.component.html',
  styleUrls: ['./debug.component.scss'],
})
export class DebugComponent implements OnInit, OnDestroy {
  relay = 'wss://relay.damus.io';
  logs = new Map<Date, Nip46Log>();
  nip46Uri: string | undefined;
  isConnected = false;

  manualFlowConfig = new ManualFlowConfig();

  get color(): ThemePalette {
    return this._mixedService.isLightMode ? 'primary' : 'primary';
  }

  private _appPrivkey!: string;
  private _appPubkey!: string;
  private _nip46App: Nip46App | undefined;
  private _manualFlowRequest = new Subject<
    'get_public_key' | 'sign_event' | 'delegate' | 'describe'
  >();
  private _manualFlowRequestSubscription: Subscription | undefined;

  constructor(private _mixedService: MixedService) {
    this._mixedService.switchToLightMode();
  }

  ngOnInit(): void {
    this._appPrivkey = generatePrivateKey();
    this._appPubkey = getPublicKey(this._appPrivkey);
  }

  ngOnDestroy(): void {
    this._mixedService.switchToDarkMode();
    this._manualFlowRequestSubscription?.unsubscribe();
  }

  keyDescOrder = (
    a: KeyValue<Date, Nip46Log>,
    b: KeyValue<Date, Nip46Log>
  ): number => {
    return a.key > b.key ? -1 : b.key > a.key ? 1 : 0;
  };

  generate() {
    try {
      // Make sure all previous "ons" are removed.
      this._off();

      // Terminate connection of any previous running app.
      this._nip46App?.goOffline();

      const app = new Nip46Uri({
        pubkey: this._appPubkey,
        relay: this.relay ?? 'wss://relay.damus.io',
        metadata: {
          name: 'delegation.monster',
          url: 'https://delegation.monster',
          description: 'A NIP-46 Test App.',
        },
      });
      this.nip46Uri = app.toURI();

      this._nip46App = new Nip46App(app, this._appPrivkey);

      this._nip46App.events.on(
        Nip46AppEvent.IncomingRequest_connect,
        this._onConnect.bind(this)
      );

      this._nip46App.goOnline();
    } catch (error) {
      console.log(error);
    }
  }

  goOffline() {
    this.isConnected = false;
    this._nip46App?.goOffline();
  }

  onClickManualRequest(
    request: 'describe' | 'get_public_key' | 'sign_event' | 'delegate'
  ) {
    this._manualFlowRequest.next(request);
  }

  private async _onConnect(signerPubkey: string) {
    this.isConnected = true;

    this._log('in', `connect, signer pubkey: ${signerPubkey}`);

    if (!this._nip46App) {
      return;
    }

    await this._manualFlow(this._nip46App);
  }

  private async _manualFlow(app: Nip46App) {
    this._manualFlowRequestSubscription = this._manualFlowRequest.subscribe(
      async (name) => {
        if (name === 'get_public_key') {
          // GET_PUBLIC_KEY
          this._log('out', 'get_public_key');
          try {
            const pubkey = await app.sendGetPublicKey();
            this._log('in', `get_public_key: ${pubkey}`);
          } catch (error) {
            this._log('in', 'get_public_key: ' + JSON.stringify(error));
          }
        } else if (name === 'describe') {
          // DESCRIBE
          this._log('out', 'describe');
          try {
            const result = await app.sendDescribe();
            this._log('in', `describe: ${result}`);
          } catch (error) {
            this._log('in', `describe: ${JSON.stringify(error)}`);
          }
        } else if (name === 'sign_event') {
          // SIGN_EVENT
          try {
            const unsignedEvent: EventTemplate = {
              kind: Kind.Text,
              created_at: Math.floor(Date.now() / 1000),
              tags: [],
              content: `This is a test note to verify that you are in control of your pubkey. It will NOT be published.`,
            };

            this._log('out', 'sign_event', unsignedEvent);
            const signedEvent = await app.sendSignEvent(unsignedEvent);

            const veryOk = verifySignature(signedEvent);
            if (!veryOk) {
              this._log('in', 'sign_event: verification error');
            } else {
              const delegator = nip26.getDelegator(signedEvent);
              if (delegator) {
                this._log('in', 'sign_event (with delegation)', signedEvent);
              } else {
                this._log('in', 'sign_event', signedEvent);
              }
            }

            // CHeck if the signed event is valid.
          } catch (error) {
            this._log('in', `sign_event: ${JSON.stringify(error)}`);
          }
        } else if (name === 'delegate') {
          // DELEGATE
          const pubkey = this.manualFlowConfig.delegatePubkey;
          const since =
            DateTime.now().startOf('day').toJSDate().getTime() / 1000;
          const until =
            DateTime.now()
              .startOf('day')
              .plus({ days: 30 })
              .toJSDate()
              .getTime() / 1000;
          const params: Nip46DelegateRequestParams = [
            pubkey,
            { kind: 1, since, until },
          ];

          this._log('out', 'delegate', params);
          try {
            const result = await app.sendDelegate(params);
            this._log('in', 'delegate', result);
          } catch (error) {
            this._log('in', `delegate: ${JSON.stringify(error)}`);
          }
        }
      }
    );
  }

  private _off() {
    this._nip46App?.events.off(
      Nip46AppEvent.IncomingRequest_connect,
      this._onConnect.bind(this)
    );
  }

  private _log(direction: 'in' | 'out', message: string, details?: object) {
    this.logs.set(new Date(), new Nip46Log({ direction, message, details }));
  }
}
