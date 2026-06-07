/** A product is out of stock when its known quantity field is zero or below. */
export const isOutOfStock = (product) => {
  if (!product) return false;
  const { quantity_available, stock_quantity } = product;
  return (
    (quantity_available !== undefined && parseFloat(quantity_available) <= 0) ||
    (stock_quantity !== undefined && Number(stock_quantity) <= 0)
  );
};
