import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IOrderedProduct {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not founded.');
    }

    const productsId = products.map(product => ({
      id: product.id,
    }));

    const foundedProducts = await this.productsRepository.findAllById(
      productsId,
    );

    const productsToUpdateQuantity: IProduct[] = [];
    const productsToAddPrice: IOrderedProduct[] = [];

    products.forEach(item => {
      const product = foundedProducts.find(
        foundedProduct => foundedProduct.id === item.id,
      );

      if (!product) {
        throw new AppError('Product not founded.');
      }

      if (item.quantity > product.quantity) {
        throw new AppError('Quantity not availabel.');
      }

      productsToUpdateQuantity.push({
        id: item.id,
        quantity: product.quantity - item.quantity,
      });

      productsToAddPrice.push({
        product_id: item.id,
        quantity: item.quantity,
        price: product.price,
      });
    });

    await this.productsRepository.updateQuantity(productsToUpdateQuantity);

    const order = await this.ordersRepository.create({
      customer,
      products: productsToAddPrice,
    });

    return order;
  }
}

export default CreateOrderService;
