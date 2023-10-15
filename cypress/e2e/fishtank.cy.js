const username = Cypress.env().CYPRESS_USERNAME
const password = `${Cypress.env().CYPRESS_PASSWORD}{enter}`

Cypress.Commands.add('login', () => {
  cy.session('login', () => {
    cy.visit('https://www.fishtank.live/')
    cy.get(':nth-child(1) > input', {log: false}).type(username, {log: false})
    cy.get(':nth-child(2) > input', {log: false}).type(password, {log: false})
  }, {
    validate() {
      cy.document()
        .its('cookie')
        .should('contain', 'auth-token')
    }
  })
})

it('downloaded all fishtank episodes', () => {
  cy.login()
  cy.visit('https://www.fishtank.live/')
  // Get episode list
  cy.get('[class^="episodes_episodes-grid"]', { timeout: 10000 }).then(([allVideos]) => {
    const [,reactFiber] = Object.entries(allVideos).find(([key]) => key.startsWith('__reactFiber'))
    cy.wrap(reactFiber.memoizedProps.children.map(x => x.props.episode).filter(x => x.jwt).map((x, i) => ({
      title: `Fishtank.live.S01E${String(i + 1).padStart(2, '0')}`,
      download: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/video?jwt=${x.jwt}`,
      stream: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/1080p0/index.m3u8?jwt=${x.jwt}`
    }))).as('episodes')
  })
  // Download episodes
  cy.get('@episodes').then(episodes => {
    expect(episodes.length).to.be.greaterThan(0)
    for (let episode of episodes) {
      const filename = `${episode.title}.mp4`;
      cy.print('Downloading', filename)
      cy.downloadFile(episode.download, 'episodes', filename)
    }
  })
})