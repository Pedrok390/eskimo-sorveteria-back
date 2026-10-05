const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    channel: {
      type: String,
      enum: ["store", "online"],
      required: true
    },

    // =====================================
    // CLIENTE
    // =====================================

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null
    },

    /*
     * Snapshot dos dados do cliente.
     *
     * Mesmo que o cliente altere nome/endereço
     * futuramente, o pedido antigo continua
     * mostrando os dados usados naquela compra.
     */
    customer: {
      /*
      * false = consumidor não identificado
      * true  = cliente identificado
      */
      identified: {
        type: Boolean,
        default: false
      },

      name: {
        type: String,
        default: ""
      },

      cpf: {
        type: String,
        default: null
      },

      phone: {
        type: String,
        default: ""
      },

      address: {
        street: {
          type: String,
          default: ""
        },

        number: {
          type: String,
          default: ""
        },

        complement: {
          type: String,
          default: ""
        },

        neighborhood: {
          type: String,
          default: ""
        },

        city: {
          type: String,
          default: ""
        },

        state: {
          type: String,
          default: ""
        },

        zipCode: {
          type: String,
          default: ""
        }
      }
    },

    // =====================================
    // ITENS
    // =====================================

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },

        name: {
          type: String,
          required: true
        },

        category: {
          type: String,
          default: ""
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        /*
         * Preço normal daquele produto
         * naquela loja no momento da venda.
         */
        originalUnitPrice: {
          type: Number,
          required: true,
          min: 0
        },

        /*
         * Preço realmente utilizado após
         * promoção automática.
         */
        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0
        },

        // Snapshot da promoção aplicada
        promotion: {
          promotionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Promotion",
            default: null
          },

          name: {
            type: String,
            default: null
          },

          discountType: {
            type: String,
            enum: [
              "fixed_price",
              "percentage",
              null
            ],
            default: null
          },

          promotionalPrice: {
            type: Number,
            default: null
          },

          percentage: {
            type: Number,
            default: null
          }
        }
      }
    ],

    // =====================================
    // VALORES DOS PRODUTOS
    // =====================================

    originalSubtotal: {
      type: Number,
      required: true,
      min: 0
    },

    promotionDiscount: {
      type: Number,
      default: 0,
      min: 0
    },

    /*
     * Subtotal depois das promoções
     * automáticas.
     */
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    // =====================================
    // AJUSTES MANUAIS DO PDV
    // =====================================

    manualDiscount: {
      type: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
      },

      value: {
        type: Number,
        default: 0,
        min: 0
      },

      amount: {
        type: Number,
        default: 0,
        min: 0
      },

      reason: {
        type: String,
        default: ""
      }
    },

    manualSurcharge: {
      type: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
      },

      value: {
        type: Number,
        default: 0,
        min: 0
      },

      amount: {
        type: Number,
        default: 0,
        min: 0
      },

      reason: {
        type: String,
        default: ""
      }
    },

    /*
     * subtotal
     * - desconto manual
     * + acréscimo manual
     */
    adjustedSubtotal: {
      type: Number,
      required: true,
      min: 0
    },

    // =====================================
    // TAXA DE SERVIÇO ONLINE
    // =====================================

    serviceFee: {
      type: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
      },

      value: {
        type: Number,
        default: 0,
        min: 0
      },

      amount: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    // =====================================
    // ENTREGA
    // =====================================

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },

    delivery: {
      provider: {
        type: String,
        default: null
      },

      quoteId: {
        type: String,
        default: null
      },

      deliveryId: {
        type: String,
        default: null
      },

      status: {
        type: String,
        default: null
      }
    },

    // =====================================
    // TOTAL
    // =====================================

    total: {
      type: Number,
      required: true,
      min: 0
    },

    // =====================================
    // PAGAMENTOS
    // =====================================

    payments: [
      {
        method: {
          type: String,
          enum: [
            "cash",
            "pix",
            "credit",
            "debit",
            "voucher"
          ],
          required: true
        },

        amount: {
          type: Number,
          required: true,
          min: 0
        },

        /*
         * Utilizado principalmente para
         * pagamento em dinheiro.
         */
        receivedAmount: {
          type: Number,
          default: null
        },

        change: {
          type: Number,
          default: 0,
          min: 0
        },

        status: {
          type: String,
          enum: [
            "pending",
            "approved",
            "cancelled",
            "refunded"
          ],
          default: "pending"
        },

        transactionId: {
          type: String,
          default: null
        },

        provider: {
          type: String,
          default: null
        }
      }
    ],

    // =====================================
    // NOTA FISCAL
    // =====================================

    fiscalDocument: {
      requested: {
        type: Boolean,
        default: false
      },

      includeCpf: {
        type: Boolean,
        default: false
      },

      cpf: {
        type: String,
        default: null
      },

      issued: {
        type: Boolean,
        default: false
      },

      number: {
        type: String,
        default: null
      }
  },

    // =====================================
    // FUNCIONÁRIO
    // =====================================

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // =====================================
    // STATUS
    // =====================================

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "completed",
        "cancelled"
      ],
      default: "pending"
    },

    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);


// =====================================
// ÍNDICES
// =====================================

orderSchema.index({
  store: 1,
  createdAt: -1
});

orderSchema.index({
  store: 1,
  channel: 1,
  createdAt: -1
});

orderSchema.index({
  client: 1,
  createdAt: -1
});

orderSchema.index({
  store: 1,
  status: 1,
  createdAt: -1
});


module.exports = mongoose.model(
  "Order",
  orderSchema
);