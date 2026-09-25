from neo4j import GraphDatabase, Driver
import logging
from config import Config

logger = logging.getLogger(__name__)

class Neo4jClient:
    _driver: Driver = None

    @classmethod
    def get_driver(cls) -> Driver:
        if cls._driver is None:
            try:
                cls._driver = GraphDatabase.driver(
                    Config.NEO4J_URI,
                    auth=(Config.NEO4J_USERNAME, Config.NEO4J_PASSWORD),
                    max_connection_lifetime=30 * 60,
                    max_connection_pool_size=50,
                    connection_acquisition_timeout=2 * 60
                )
                logger.info("Connected to Neo4j Aura Cloud DB successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j: {e}")
                raise
        return cls._driver

    @classmethod
    def close(cls):
        if cls._driver is not None:
            cls._driver.close()
            cls._driver = None
            logger.info("Neo4j driver connection closed.")

    @classmethod
    def query(cls, cypher_query: str, parameters: dict = None):
        driver = cls.get_driver()
        with driver.session() as session:
            result = session.run(cypher_query, parameters or {})
            return [record.data() for record in result]

    @classmethod
    def write_transaction(cls, tx_func, *args, **kwargs):
        driver = cls.get_driver()
        with driver.session() as session:
            return session.execute_write(tx_func, *args, **kwargs)

    @classmethod
    def verify_connectivity(cls) -> bool:
        try:
            driver = cls.get_driver()
            driver.verify_connectivity()
            return True
        except Exception as e:
            logger.error(f"Neo4j Connectivity Check Failed: {e}")
            return False
