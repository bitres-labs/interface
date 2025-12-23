import { metaMaskFixtures as metaMaskFixturesLocal } from './metamask-fixtures'
import { metaMaskFixtures as metaMaskFixturesCDP } from './metamask-cdp-fixtures'

export const metaMaskFixtures = process.env.PW_CDP_URL ? metaMaskFixturesCDP : metaMaskFixturesLocal
