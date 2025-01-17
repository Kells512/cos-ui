import {
  ConnectorTypesOrderBy,
  ConnectorTypesSearch,
  fetchConnectorTypes,
} from '@apis/api';
import { PAGINATED_MACHINE_ID } from '@constants/constants';

import { ActorRefFrom, send, sendParent } from 'xstate';
import { createModel } from 'xstate/lib/model';

import { ConnectorType } from '@rhoas/connector-management-sdk';

import {
  PaginatedApiSuccessResponse,
  getPaginatedApiMachineEvents,
  makePaginatedApiMachine,
} from './PaginatedResponse.machine';

export const DEFAULT_CONNECTOR_TYPES_PAGE_SIZE = 20;

type Context = {
  accessToken: () => Promise<string>;
  connectorsApiBasePath: string;
  response?: PaginatedApiSuccessResponse<ConnectorType>;
  selectedConnector?: ConnectorType;
  error?: Object;
  connectorTypeDetails: ConnectorType;
  duplicateMode?: boolean | undefined;
};

const model = createModel(
  {
    accessToken: () => Promise.resolve(''),
    connectorsApiBasePath: '',
    response: undefined,
    selectedConnector: undefined,
    error: undefined,
  } as Context,
  {
    events: {
      selectConnector: (payload: { selectedConnector: string }) => ({
        ...payload,
      }),
      deselectConnector: () => ({}),
      confirm: () => ({}),
      ...getPaginatedApiMachineEvents<
        ConnectorType,
        ConnectorTypesOrderBy,
        ConnectorTypesSearch,
        ConnectorType
      >(),
    },
  }
);

const success = model.assign((_context, event) => {
  const { type, ...response } = event;
  return {
    response,
  };
}, 'api.success');
const selectConnector = model.assign(
  {
    selectedConnector: ({ response }, { selectedConnector }) =>
      response!.items.find((connector) => connector.id === selectedConnector),
  },
  'selectConnector'
);
const reset = model.assign(
  {
    selectedConnector: undefined,
  },
  'deselectConnector'
);

export const selectConnectorTypeMachine = model.createMachine(
  {
    context: model.initialContext,
    id: 'selectConnectorType',
    predictableActionArguments: true,
    initial: 'root',
    states: {
      root: {
        type: 'parallel',
        states: {
          api: {
            initial: 'idle',
            invoke: {
              id: PAGINATED_MACHINE_ID,
              src: (context) =>
                makePaginatedApiMachine<
                  ConnectorType,
                  ConnectorTypesOrderBy,
                  ConnectorTypesSearch,
                  ConnectorType
                >(fetchConnectorTypes(context), (i) => i, {
                  initialPageSize: DEFAULT_CONNECTOR_TYPES_PAGE_SIZE,
                }),
            },
            states: {
              idle: {
                entry: send(
                  {
                    type: 'api.query',
                    query: { categories: ['sink', 'source'] },
                  },
                  { to: PAGINATED_MACHINE_ID }
                ),
                on: {
                  'api.ready': 'ready',
                },
              },
              ready: {},
            },
            on: {
              'api.refresh': {
                actions: send((_, e) => e, { to: PAGINATED_MACHINE_ID }),
              },
              'api.nextPage': {
                actions: send((_, e) => e, { to: PAGINATED_MACHINE_ID }),
              },
              'api.prevPage': {
                actions: send((_, e) => e, { to: PAGINATED_MACHINE_ID }),
              },
              'api.query': {
                actions: send((_, e) => e, { to: PAGINATED_MACHINE_ID }),
              },
              'api.success': { actions: success },
            },
          },
          selection: {
            id: 'selection',
            initial: 'verify',
            states: {
              verify: {
                always: [
                  { target: 'selecting', cond: 'noConnectorSelected' },
                  { target: 'valid', cond: 'connectorSelected' },
                ],
              },
              selecting: {
                entry: sendParent('isInvalid'),
                on: {
                  selectConnector: {
                    target: 'valid',
                    actions: selectConnector,
                    cond: (_, event) => event.selectedConnector !== undefined,
                  },
                },
              },
              valid: {
                entry: sendParent('isValid'),
                on: {
                  selectConnector: {
                    target: 'verify',
                    actions: selectConnector,
                  },
                  deselectConnector: {
                    target: 'verify',
                    actions: reset,
                  },
                  confirm: {
                    target: '#done',
                    cond: 'connectorSelected',
                  },
                },
              },
            },
          },
        },
      },
      done: {
        id: 'done',
        type: 'final',
        data: {
          selectedConnector: (context: Context) => context.selectedConnector,
          duplicateMode: (context: Context) => context.duplicateMode,
          connectorTypeDetails: (context: Context) =>
            context.connectorTypeDetails,
        },
      },
    },
  },
  {
    guards: {
      connectorSelected: (context) => context.selectedConnector !== undefined,
      noConnectorSelected: (context) => context.selectedConnector === undefined,
    },
  }
);

export type ConnectorTypesMachineActorRef = ActorRefFrom<
  typeof selectConnectorTypeMachine
>;
