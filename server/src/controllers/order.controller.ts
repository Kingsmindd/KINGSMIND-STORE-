import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import {
  OrderValidationError,
  validateDeliveryQuoteInput,
  validateCancelOrderInput,
} from "../validations/order.validation.js";
import {
  OrderError,
  confirmDeliveryQuoteService,
  deleteDeliveryQuoteService,
  getCustomerOrderService,
  cancelOrderService,
  listAdminOrdersService,
  getAdminOrderService,
  confirmOrderService,
  shipOrderService,
  completeDeliveryService,
  listCustomerOrdersService,
} from "../services/order.service.js";

export function createOrderController(pool: Pool) {
  async function confirmDeliveryQuoteController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const body: unknown = req.body;
      const input = validateDeliveryQuoteInput(body);

      const order = await confirmDeliveryQuoteService(pool, orderId, input);

      res.setHeader("Cache-Control", "no-store");

      res.status(200).json({
        message:
          "Delivery quote confirmed. Order is awaiting confirmation. Payment is due on delivery.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function getCustomerOrderController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const order = await getCustomerOrderService(pool, userId, orderId);

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ order });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function editDeliveryQuoteController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const body: unknown = req.body;
      const input = validateDeliveryQuoteInput(body);

      const order = await confirmDeliveryQuoteService(
        pool,
        orderId,
        input,
        "edit",
      );

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        message:
          "Delivery quote updated. Order is awaiting confirmation. Payment is due on delivery.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function deleteDeliveryQuoteController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const order = await deleteDeliveryQuoteService(pool, orderId);

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({
        message:
          "Delivery quote deleted. Order is awaiting a new delivery quote.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function cancelOrderController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const adminId = req.session?.userId;

      if (!adminId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const body: unknown = req.body;
      const input = validateCancelOrderInput(body);

      const order = await cancelOrderService(pool, orderId, adminId, input);

      res.status(200).json({
        message: "Order cancelled.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function listAdminOrdersController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const rawPage = req.query.page;
      let page = 1;

      if (rawPage !== undefined) {
        if (typeof rawPage !== "string" || !/^[1-9][0-9]{0,5}$/.test(rawPage)) {
          throw new OrderValidationError(
            "Page must be a whole number between 1 and 100000.",
          );
        }

        page = Number(rawPage);
      }

      const result = await listAdminOrdersService(pool, page);

      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function getAdminOrderController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const order = await getAdminOrderService(pool, orderId);

      res.status(200).json({ order });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function confirmOrderController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }
      const order = await confirmOrderService(pool, orderId);

      res.status(200).json({
        message:
          "Order confirmed and stock allocated. Payment is due on delivery.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function shipOrderController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const adminId = req.session?.userId;

      if (!adminId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const order = await shipOrderService(pool, orderId, adminId);

      res.status(200).json({
        message: "Order marked as shipped. Payment is due on delivery.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function completeDeliveryController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const adminId = req.session?.userId;

      if (!adminId) {
        res.status(401).json({
          error: "Please log in to continue.",
        });
        return;
      }

      const orderId = req.params.orderId;

      if (
        typeof orderId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        )
      ) {
        throw new OrderValidationError("Invalid order ID.");
      }

      const order = await completeDeliveryService(pool, orderId, adminId);

      res.status(200).json({
        message: "Order delivered and payment received.",
        order,
      });
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  async function listCustomerOrdersController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const userId = req.session?.userId;

      if (!userId) {
        res.status(401).json({ error: "Please log in to continue." });
        return;
      }

      const rawPage = req.query.page;

      if (
        rawPage !== undefined &&
        (typeof rawPage !== "string" || !/^[1-9][0-9]{0,5}$/.test(rawPage))
      ) {
        throw new OrderError(
          "Page must be a whole number between 1 and 100000.",
          400,
        );
      }

      const page = rawPage === undefined ? 1 : Number(rawPage);
      const result = await listCustomerOrdersService(pool, userId, page);

      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  return {
    confirmDeliveryQuoteController,
    getCustomerOrderController,
    editDeliveryQuoteController,
    deleteDeliveryQuoteController,
    cancelOrderController,
    listAdminOrdersController,
    getAdminOrderController,
    confirmOrderController,
    shipOrderController,
    completeDeliveryController,
    listCustomerOrdersController,
  };
}
