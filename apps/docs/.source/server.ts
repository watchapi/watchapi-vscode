// @ts-nocheck
import * as __fd_glob_29 from "../content/docs/api/sync/syncCollection.mdx?collection=docs"
import * as __fd_glob_28 from "../content/docs/api/sync/getSyncStatus.mdx?collection=docs"
import * as __fd_glob_27 from "../content/docs/api/monitoring/listRequests.mdx?collection=docs"
import * as __fd_glob_26 from "../content/docs/api/monitoring/listAlerts.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/api/monitoring/createAlert.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/api/endpoints/updateEndpoint.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/api/endpoints/listEndpoints.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/api/endpoints/getEndpoint.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/api/endpoints/deleteEndpoint.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/api/endpoints/createEndpoint.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/api/collections/updateCollection.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/api/collections/listCollections.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/api/collections/getCollection.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/api/collections/deleteCollection.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/api/collections/createCollection.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/cloud/monitoring.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/cloud/getting-started.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/cloud/api-access.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/cloud/alerts.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/api/index.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/privacy.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/installation.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_6 } from "../content/docs/api/sync/meta.json?collection=docs"
import { default as __fd_glob_5 } from "../content/docs/api/monitoring/meta.json?collection=docs"
import { default as __fd_glob_4 } from "../content/docs/api/endpoints/meta.json?collection=docs"
import { default as __fd_glob_3 } from "../content/docs/api/collections/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/cloud/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/api/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "api/meta.json": __fd_glob_1, "cloud/meta.json": __fd_glob_2, "api/collections/meta.json": __fd_glob_3, "api/endpoints/meta.json": __fd_glob_4, "api/monitoring/meta.json": __fd_glob_5, "api/sync/meta.json": __fd_glob_6, }, {"index.mdx": __fd_glob_7, "installation.mdx": __fd_glob_8, "privacy.mdx": __fd_glob_9, "api/index.mdx": __fd_glob_10, "cloud/alerts.mdx": __fd_glob_11, "cloud/api-access.mdx": __fd_glob_12, "cloud/getting-started.mdx": __fd_glob_13, "cloud/monitoring.mdx": __fd_glob_14, "api/collections/createCollection.mdx": __fd_glob_15, "api/collections/deleteCollection.mdx": __fd_glob_16, "api/collections/getCollection.mdx": __fd_glob_17, "api/collections/listCollections.mdx": __fd_glob_18, "api/collections/updateCollection.mdx": __fd_glob_19, "api/endpoints/createEndpoint.mdx": __fd_glob_20, "api/endpoints/deleteEndpoint.mdx": __fd_glob_21, "api/endpoints/getEndpoint.mdx": __fd_glob_22, "api/endpoints/listEndpoints.mdx": __fd_glob_23, "api/endpoints/updateEndpoint.mdx": __fd_glob_24, "api/monitoring/createAlert.mdx": __fd_glob_25, "api/monitoring/listAlerts.mdx": __fd_glob_26, "api/monitoring/listRequests.mdx": __fd_glob_27, "api/sync/getSyncStatus.mdx": __fd_glob_28, "api/sync/syncCollection.mdx": __fd_glob_29, });