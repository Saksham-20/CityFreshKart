import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import ProductImages from './ProductImages';
import ProductVariants from './ProductVariants';
import api from '../../services/api';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      
      if (response.data) {
        setProduct(response.data.data.product);
        if (response.data.data.product && response.data.data.product.variants && response.data.data.product.variants.length > 0) {
          setSelectedVariant(response.data.data.product.variants[0]);
        }
      } else {
        console.error('Failed to fetch product');
        setProduct(null);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: selectedVariant?.price || product.price,
        image: product.images && product.images[0] ? product.images[0].image_url : product.primary_image,
        quantity,
        variant: selectedVariant
      });
    }
  };

  if (loading) return <Loading />;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <ProductImages images={product.images || []} />

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-lg text-gray-600 mt-2">{product.category_name}</p>
          </div>

          {/* Price */}
          <div className="flex items-center space-x-4">
            <span className="text-3xl font-bold text-gray-900">
              ₹{selectedVariant?.price || product.price}
            </span>
            {product.compare_price && (
              <span className="text-lg text-gray-500 line-through">
                ₹{product.compare_price}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Description</h3>
            <p className="text-gray-600 mt-2">{product.description}</p>
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <ProductVariants
              variants={product.variants}
              selectedVariant={selectedVariant}
              onVariantSelect={setSelectedVariant}
            />
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                variant="outline"
                size="sm"
              >
                -
              </Button>
              <span className="w-16 text-center">{quantity}</span>
              <Button
                onClick={() => setQuantity(quantity + 1)}
                variant="outline"
                size="sm"
              >
                +
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              onClick={handleAddToCart}
              className="flex-1"
              size="lg"
            >
              Add to Cart
            </Button>
          </div>

          {/* Product Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Category</dt>
                <dd className="text-gray-900">{product.category_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">SKU</dt>
                <dd className="text-gray-900">{product.sku || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Availability</dt>
                <dd className="text-gray-900">
                  {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
