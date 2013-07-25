import sys


def includeme(config):
    """ This function returns a Pyramid WSGI application."""

    # determine which providers we want to configure
    settings = config.get_settings()
    providers = settings['login_providers']
    providers = filter(None, [p.strip()
                              for line in providers.splitlines()
                              for p in line.split(', ')])
    config.add_settings(login_providers=providers)
    if not any(providers):
        sys.stderr.write('no login providers configured, double check '
                         'your ini file and add a few')

    if 'facebook' in providers:
        config.include('velruse.providers.facebook')
        config.add_facebook_login_from_settings(prefix='facebook.')

    if 'github' in providers:
        config.include('velruse.providers.github')
        config.add_github_login_from_settings(prefix='github.')

    if 'twitter' in providers:
        config.include('velruse.providers.twitter')
        config.add_twitter_login_from_settings(prefix='twitter.')

    if 'live' in providers:
        config.include('velruse.providers.live')
        config.add_live_login_from_settings(prefix='live.')

    if 'bitbucket' in providers:
        config.include('velruse.providers.bitbucket')
        config.add_bitbucket_login_from_settings(prefix='bitbucket.')

    if 'google' in providers:
        config.include('velruse.providers.google_oauth2')
        config.add_google_oauth2_login(
            #realm=settings['google.realm'],
            consumer_key=settings['google.consumer_key'],
            consumer_secret=settings['google.consumer_secret'],
        )

    if 'openid' in providers:
        config.include('velruse.providers.openid')
        config.add_openid_login(
            realm=settings['openid.realm']
        )

    if 'yahoo' in providers:
        config.include('velruse.providers.yahoo')
        config.add_yahoo_login(
            realm=settings['yahoo.realm'],
            consumer_key=settings['yahoo.consumer_key'],
            consumer_secret=settings['yahoo.consumer_secret'],
        )
