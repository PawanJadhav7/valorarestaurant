from .registry import POSAdapterRegistry
from .clover_adapter import CloverAdapter
from .square_adapter import SquareAdapter
from .toast_adapter import ToastAdapter

pos_registry = POSAdapterRegistry()
pos_registry.register(CloverAdapter())
pos_registry.register(SquareAdapter())
pos_registry.register(ToastAdapter())