import logging
import sys

import transaction

from ..lib.sqla import (configure_engine, get_session_maker,
                        get_metadata, is_zopish, mark_changed)


log = logging.getLogger('pytest.assembl')


def as_boolean(s):
    if isinstance(s, bool):
        return s
    return str(s).lower() in ['true', '1', 'on', 'yes']


def get_all_tables(app_settings, session, reversed=True):
    schema = app_settings.get('db_schema', 'assembl_test')
    # TODO: Quote schema name!
    res = session.execute(
        "SELECT table_name FROM "
        "information_schema.tables WHERE table_schema = "
        "'%s' ORDER BY table_name" % (schema,)).fetchall()
    res = {row[0] for row in res}
    # get the ordered version to minimize cascade.
    # cascade does not exist on virtuoso.
    import assembl.models
    ordered = [t.name for t in get_metadata().sorted_tables
               if t.name in res]
    ordered.extend([t for t in res if t not in ordered])
    if reversed:
        ordered.reverse()
    log.debug('Current tables: %s' % str(ordered))
    return ordered


def clear_rows(app_settings, session):
    log.info('Clearing database rows.')
    for row in get_all_tables(app_settings, session):
        log.debug("Clearing table: %s" % row)
        session.execute("delete from \"%s\"" % row)
    session.commit()
    session.transaction.close()


def drop_tables(app_settings, session):
    log.info('Dropping all tables.')
    try:
        for row in get_all_tables(app_settings, session):
            log.debug("Dropping table: %s" % row)
            session.execute("drop table \"%s\"" % row)
        mark_changed()
    except:
        raise Exception('Error dropping tables: %s' % (
            sys.exc_info()[1]))
