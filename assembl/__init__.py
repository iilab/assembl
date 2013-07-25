""" Pyramid add start-up module. """

from pyramid.config import Configurator
from pyramid.session import UnencryptedCookieSessionFactoryConfig

def main(global_config, **settings):
    """ Return a Pyramid WSGI application. """
    settings['config_uri'] = global_config['__file__']

    # velruse requires session support
    session_factory = UnencryptedCookieSessionFactoryConfig(
        settings['session.secret'],
    )

    config = Configurator(settings=settings)
    config.set_session_factory(session_factory)
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.include('cornice')  # REST services library.
    config.include('.lib.sqla')
    config.include('.lib.alembic')
    config.include('.lib.email')
    config.include('.views')

    config.scan('.lib')
    config.scan('.views')

    # jinja2
    config.include('pyramid_jinja2')

    return config.make_wsgi_app()
